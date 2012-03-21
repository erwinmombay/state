// <a id="state-controller" />

// ## StateController
// 
// A state **controller** is the mediator between an owner object and its implementation of state.
// The controller maintains the identity of the owner’s active state, and facilitates transitions
// from one state to another. It provides the behavior-modeling aspect of the owner’s state by
// forwarding method calls made on the owner to any associated stateful implementations of those
// methods that are valid given the current state.

var StateController = ( function () {

    // ### Constructor
    function StateController (
                          /*Object*/ owner,      // = {}
        /*StateExpression | Object*/ expression, // optional
                          /*Object*/ options     // optional
    ) {
        if ( !( this instanceof StateController ) ) {
            return new StateController( owner, expression, options );
        }
        
        var self = this,
            name, root, current, transition,
            defaultSubstate;
        
        function setCurrent ( value ) { return current = value; }
        function setTransition ( value ) { return transition = value; }
        
        // Validate arguments.
        owner || ( owner = {} );
        expression instanceof StateExpression ||
            ( expression = new StateExpression( expression ) );
        options === undefined && ( options = {} ) ||
            typeof options === 'string' && ( options = { initialState: options } );
        
        // Assign a function to the owner that will serve as its interface into its state.
        name = options.name || 'state';
        owner[ name ] = createAccessor( owner, name, this );
        
        // ### Internal privileged methods
        Z.assign( this, {
            // #### owner
            // 
            // Returns the owner object on whose behalf this controller acts.
            owner: function () { return owner; },

            // #### name
            // 
            // Returns the name assigned to this controller. This is also the key in `owner` that
            // holds the `accessor` function associated with this controller.
            name: Z.stringFunction( function () { return name; } ),

            // #### root
            // 
            // Returns the root state.
            root: function () { return root; },

            // #### current
            // 
            // Returns the controller’s current state, or currently active transition.
            current: Z.assign( function () { return current; }, {
                toString: function () { return current ? current.toString() : undefined; }
            }),

            // #### transition
            // 
            // Returns the currently active transition, or `undefined` if the controller is not
            // presently engaged in a transition.
            transition: Z.assign( function () { return transition; }, {
                toString: function () { return transition ? transition.toString() : ''; }
            })
        });
        
        // Assign partially applied external privileged methods.
        Z.privilege( this, StateController.privileged, {
            'change' : [ setCurrent, setTransition ]
        });
        
        // Instantiate the root state, adding a redefinition of the `controller` method that points
        // directly to this controller, along with all of the members and substates outlined in
        // `expression`.
        root = new State( undefined, undefined, expression );
        root.controller = function () { return self; };
        root.init( expression );
        
        // Establish which state should be the initial state and set the current state to that.
        current = root.initialSubstate() || root;
        options.initialState !== undefined && ( current = root.match( options.initialState ) );
        current.isAbstract() && ( defaultSubstate = current.defaultSubstate() ) &&
            ( current = defaultSubstate );
        current.controller() === this || ( current = virtualize.call( this, current ) );

        // (Exposed for debugging.)
        Z.env.debug && Z.assign( this.__private__ = {}, {
            root: root,
            owner: owner,
            options: options
        });
    }

    // ### Static functions

    // #### createAccessor
    // 
    // Returns an `accessor` function, which will serve as an owner object’s interface to the
    // implementation of its state.
    function createAccessor ( owner, name, self ) {
        function accessor () {
            var current, controller, root, key, method,
                fn = arguments[0];

            if ( this === owner ) {
                if ( Z.isFunction( fn ) ) {
                    return self.change( fn.call( this ) );
                }
                current = self.current();
                return arguments.length ? current.match.apply( current, arguments ) : current;
            }

            // Calling the accessor of a prototype means that `this` requires its own accessor
            // and `StateController`.
            else if (
                Object.prototype.isPrototypeOf.call( owner, this ) &&
                !Z.hasOwn( this, name )
            ) {
                controller = new StateController( this, null, {
                    name: name,
                    initialState: self.current().toString()
                });
                root = controller.root();

                // Any methods of `this` that have stateful implementations located higher in the
                // prototype chain must be copied into the root state to be used as defaults.
                for ( key in this ) if ( Z.hasOwn.call( this, key ) ) {
                    method = this[ key ];
                    if ( Z.isFunction( method ) && root.method( key, false ) ) {
                        root.addMethod( key, method );
                    }
                }

                return this[ name ].apply( this, arguments );
            }
        }
        return accessor;
    }

    // #### virtualize
    // 
    // Creates a transient virtual state within the local state hierarchy to represent
    // `protostate`, along with as many virtual superstates as are necessary to reach a real
    // `State` in the local hierarchy.
    function virtualize ( protostate ) {
        var derivation, state, next, name;
        function iterate () {
            return next = state.substate( ( name = derivation.shift() ), false );
        }
        if ( protostate instanceof State &&
            protostate.owner().isPrototypeOf( this.owner() ) &&
            ( derivation = protostate.derivation( true ) ).length
        ) {
            for ( state = this.root(), iterate(); next; state = next, iterate() );
            while ( name ) {
                state = new State( state, name, { attributes: STATE_ATTRIBUTES.VIRTUAL } );
                name = derivation.shift();
            }
            return state;
        }
    }
    
    // #### annihilate
    // 
    // Destroys the given `virtualState` and all of its virtual superstates.
    function annihilate ( virtualState ) {
        var superstate;
        while ( virtualState.isVirtual() ) {
            superstate = virtualState.superstate();
            virtualState.destroy();
            virtualState = superstate;
        }
    }
    
    // ### External privileged methods

    StateController.privileged = {

        // #### change
        // 
        // Attempts to execute a state transition. Handles asynchronous transitions, generation of
        // appropriate events, and construction of any necessary temporary virtual states. Respects
        // guards supplied in both the origin and `target` states. Fails by returning `false` if
        // the transition is disallowed.
        // 
        // The `target` parameter may be either a `State` object that is part of this controller’s
        // state hierarchy, or a string that resolves to a likewise targetable `State` when
        // evaluated from the context of the most recently current state.
        // 
        // The `options` parameter is an optional map that may include:
        // 
        // * `forced` : `Boolean` — overrides any guards defined, ensuring the change will
        //   complete, assuming a valid target.
        // * `success` : `Function` — callback to be executed upon successful completion of the
        //   transition.
        // * `failure` : `Function` — callback to be executed if the transition attempt is blocked
        //   by a guard.
        change: function ( setCurrent, setTransition ) {
            var reentrant = true;

            function push () {
                reentrant = false;
                this.push.apply( this, arguments );
                reentrant = true;
            }

            return function (
                /*State | String*/ target,
                        /*Object*/ options // optional
            ) {
                if ( !reentrant ) return;

                var owner, transition, targetOwner, source, origin, domain, info, state, record,
                    transitionExpression,
                    self = this;

                owner = this.owner();
                transition = this.transition();

                // The `origin` is defined as the controller’s most recently current state that is
                // not a `Transition`.
                origin = transition ? transition.origin() : this.current();

                // Departures are not allowed from a state that is `final`.
                if ( origin.isFinal() ) return null;

                // Resolve `target` argument to a proper `State` object if necessary.
                target instanceof State ||
                    ( target = target ? origin.match( target ) : this.root() );
            
                if ( !( target instanceof State ) ||
                        ( targetOwner = target.owner() ) !== owner &&
                        !targetOwner.isPrototypeOf( owner )
                ) {
                    return null;
                }

                // An ingressing transition that targets a retained state must be redirected to
                // whichever of that state’s internal states was most recently current.
                if ( target.isRetained() && !target.isActive() ) {
                    record = this.history( 0 );
                    target = record && target.match( record.state ) || target;
                }

                // A transition cannot target an abstract state directly, so `target` must be
                // reassigned to the appropriate concrete substate.
                while ( target.isAbstract() ) {
                    target = target.defaultSubstate();
                    if ( !target ) return null;
                }
                
                options || ( options = {} );

                // If any guards are in place for the given `origin` and `target` states, they must
                // consent to the transition, unless we specify that it be `forced`.
                if ( !options.forced && (
                        !origin.evaluateGuard( 'release', target ) ||
                        !target.evaluateGuard( 'admit', origin )
                ) ) {
                    typeof options.failure === 'function' && options.failure.call( this );
                    return null;
                }

                // If `target` is a state from a prototype of `owner`, it must be represented
                // here as a transient virtual state.
                target && target.controller() !== this &&
                    ( target = virtualize.call( this, target ) );
                
                // If a previously initiated transition is still underway, it needs to be
                // notified that it won’t finish.
                transition && transition.abort();
                
                // The `source` variable will reference the previously current state (or abortive
                // transition).
                source = state = this.current();

                // The upcoming transition will start from its `source` and proceed within the
                // `domain` of the least common ancestor between that state and the specified
                // target.
                domain = source.common( target );
                
                // Retrieve the appropriate transition expression for this origin/target pairing;
                // if none is defined, then an actionless default transition will be created and
                // applied, causing the callback to return immediately.
                transitionExpression = this.getTransitionExpressionFor( target, origin );
                transition = setTransition( new Transition( target, source,
                    transitionExpression ));
                info = { transition: transition, forced: !!options.forced };
                
                // Preparation for the transition begins by emitting a `depart` event on the
                // `source` state.
                source.emit( 'depart', info, false );

                // Enter into the transition state.
                setCurrent( transition );
                transition.emit( 'enter', false );
                
                // Walk up to the top of the domain, emitting `exit` events for each state
                // along the way.
                while ( state !== domain ) {
                    state.emit( 'exit', info, false );
                    transition.attachTo( state = state.superstate() );
                }
                
                // Provide an enclosed callback that will be called from `transition.end()` to
                // conclude the transition.
                transition.setCallback( function () {
                    var pathToState = [],
                        state, substate, superstate;
                    
                    // Trace a path from `target` up to `domain`, then walk down it, emitting
                    // `enter` events for each state along the way.
                    for ( state = target; state !== domain; state = state.superstate() ) {
                        pathToState.push( state );
                    }
                    for ( state = domain; substate = pathToState.pop(); state = substate ) {
                        if ( state.isShallow() ) {
                            state.hasHistory() && push.call( state, substate );
                        }
                        transition.attachTo( substate );
                        substate.emit( 'enter', info, false );
                    }

                    // Exit from the transition state.
                    transition.emit( 'exit', false );
                    setCurrent( target );

                    // Terminate the transition with an `arrive` event on the targeted state.
                    target.emit( 'arrive', info, false );
                    
                    // For each state from `target` to `root` that records a deep history, push a
                    // new element that points to `target`.
                    for ( state = target; state; state = superstate ) {
                        superstate = state.superstate();
                        if ( !state.isShallow() ) {
                            state.hasHistory() && push.call( state, target );
                        }
                    }

                    // Any virtual states that were previously active are no longer needed.
                    if ( origin.isVirtual() ) {
                        annihilate.call( this, origin );
                        origin = null;
                    }

                    // Now complete, the `Transition` instance can be discarded.
                    transition.destroy();
                    transition = setTransition( null );
                    
                    typeof options.success === 'function' && options.success.call( this );

                    return target;
                });
                
                // At this point the transition is attached to the `domain` state and is ready
                // to proceed.
                return transition.start.apply( transition, options.arguments ) || target;
            }
        }
    };
    
    // ### Prototype methods

    Z.assign( StateController.prototype, {

        // #### toString
        // 
        toString: function () {
            return this.current().toString();
        },

        // #### getTransitionExpressionFor
        // 
        // Finds the appropriate transition expression for the given origin and target states. If
        // no matching transitions are defined in any of the states, returns a generic actionless
        // transition expression for the origin/target pair.
        getTransitionExpressionFor: function ( target, origin ) {
            origin || ( origin = this.current() );
            
            function search ( state, until ) {
                var result;
                for ( ; state && state !== until; state = until ? state.superstate() : undefined ) {
                    Z.each( state.transitions(), function ( i, expression ) {
                        return !(
                            ( expression.target ?
                                state.match( expression.target, target ) :
                                state === target )
                                    &&
                            ( !expression.origin || state.match( expression.origin, origin ) ) &&
                        ( result = expression ) );
                    });
                }
                return result;
            }
            
            // Search order:
            // 1. `target`,
            // 2. `origin`,
            // 3. superstates of `target`,
            // 4. superstates of `origin`.
            return (
                search( target ) ||
                origin !== target && search( origin ) ||
                search( target.superstate(), this.root() ) ||
                    search( this.root() ) ||
                !target.isIn( origin ) && search( origin.superstate(), origin.common( target ) ) ||
                new TransitionExpression
            );
        },
        
        // #### destroy
        // 
        // Destroys this controller and all of its states, and returns the owner to its original
        // condition.
        destroy: function () {
            return this.root().destroy() && delete this.owner()[ this.name() ];
        }
    });

    return StateController;
})();