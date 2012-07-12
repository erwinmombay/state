// <a class="icon-link"
//    name="state--history.js"
//    href="#state--history.js"></a>
// 
// ### `state/history.js`

O.assign( State.privileged, {

    // <a class="icon-link"
    //    name="state--privileged--history"
    //    href="#state--privileged--history"></a>
    // 
    // #### history
    // 
    history: function ( history ) {
        return function ( indexDelta ) {
            if ( indexDelta === undefined ) return history.express();
            return history[ history.index + indexDelta ];
        };
    },

    // <a class="icon-link"
    //    name="state--privileged--push"
    //    href="#state--privileged--push"></a>
    // 
    // #### push
    // 
    push: function ( history ) {
        return function ( item ) {
            var state, mutation, superstate;

            item === 'string' && ( item = this.query( item, true, false ) );
            if ( item instanceof State && item.isIn( this ) ) {
                history.pushState( state = item );
            } else if ( O.isPlainObject( item ) ) {
                history.pushMutation( mutation = item );
            }

            // While the history-keeping state is inactive, a state-`push`
            // should not be propagated to any history-keeping superstates,
            // whereas a mutation-`push` should be propagated whether active or
            // inactive.
            if ( state && this.isActive() || mutation ) {
                superstate = this.superstate();
                superstate && ( superstate = superstate.historian() );
                superstate && superstate.push( item );
            }
        };
    },

    old_push: function ( history ) {
        return function ( flags, state, transition, data ) {
            var i, previous, current, superstate;

            if ( typeof flags !== 'string' ) {
                data = transition;
                transition = state;
                state = flags;
                flags = undefined;
            }

            if ( !( state instanceof State && this.has( state ) ) ) return;

            flags = O.assign( flags );

            i = history.index;
            previous = i === undefined ? null : history[i];

            i = history.index = i === undefined ? 0 : i + 1;
            current = history[i] = {
                state: state.toString(),
                transition: undefined,
                data: undefined
            };

            if ( flags.relative ) {
                if ( previous ) {
                    current.data = previous.data;
                    previous.data = O.delta( current.data, data );
                } else {
                    current.data = O.clone( data );
                }
            } else {
                current.data = O.clone( data );
                previous && ( previous.data = O.diff( previous.data, data ) );
            }

            history.splice( ++i, history.length - i );

            this.isActive() &&
                ( superstate = this.superstate() ) &&
                ( superstate = superstate.historian() ) &&
                superstate.push( state, transition, flags, data );

            1 || state.isCurrent() || this.goTo( state );

            return history.length;
        };
    },

    // <a class="icon-link"
    //    name="state--privileged--replace"
    //    href="#state--privileged--replace"></a>
    // 
    // #### replace
    // 
    replace: function ( history ) {
        return function ( item ) {
            item === 'string' && ( item = this.query( item ) );
            if ( !item ) return;
            if ( item instanceof State ) return history.replaceState( item );
            if ( O.isPlainObject( item ) ) return history.replaceMutation( item );
        };
    },

    old_replace: function ( history ) {
        return function ( flags, state, data ) {
            var previous, current, next, delta,
                i = history.index,
                l = history.length;

            if ( i === undefined ) {
                this.push.apply( this, arguments );
                return this;
            }

            if ( typeof flags !== 'string' ) {
                data = state;
                state = flags;
                flags = undefined;
            }

            if ( !state.isIn( this ) ) return;

            flags = O.assign( flags );

            current = history[i];
            i > 0 && ( previous = history[ i - 1 ] );
            i < l - 1 && ( next = history[ i + 1 ] );

            current.state = state.toString();
            delta = ( flags.relative ? O.delta : O.diff )( current.data, data );
            if ( !O.isEmpty( delta ) ) {
                previous && O.edit( true, previous.data, delta );
                next && O.edit( true, next.data, delta );
            }
            current.data = O.clone( data );

            0 && this.goTo( state );

            return this;
        };
    }
});

O.assign( State.prototype, {

    // <a class="icon-link"
    //    name="state--prototype--history"
    //    href="#state--prototype--history"></a>
    // 
    // #### history
    // 
    history: function () {
        var h = this.historian();
        if ( h ) return h.history();
    },

    // <a class="icon-link"
    //    name="state--prototype--historian"
    //    href="#state--prototype--historian"></a>
    // 
    // #### historian
    // 
    // Returns `this` if it records a history, or else the nearest superstate
    // that records a deep history.
    historian: function () {
        if ( this.hasHistory() ) return this;
        for ( var s = this.superstate(); s; s = s.superstate() ) {
            if ( s.hasHistory() && !s.isShallow() ) return s;
        }
    },

    push: function ( flags, state, transition, data ) {
        if ( typeof flags !== 'string' ) {
            data = transition;
            transition = state;
            state = flags;
            flags = undefined;
        }

        var historian = this.historian();

        if ( historian ) {
            // Before delegating to the historian, `state` must be resolved
            // locally.
            state instanceof State || ( state = this.query( state ) );

            if ( state && state.isIn( this ) ) {
                return historian.push( flags, state, transition, data );
            }
        }
    },

    replace: function ( flags, state, transition, data ) {
        var historian = this.historian();

        if ( historian ) {
            // Before delegating to the historian, `state` must be resolved
            // locally.
            state instanceof State || ( state = this.query( state ) );

            if ( state && state.isIn( this ) ) {
                return historian.push( flags, state, transition, data );
            }
        }
    },

    /** */
    pushHistory: global.history && global.history.pushState ?
        function ( title, urlBase ) {
            return global.history.pushState( this.data, title || this.toString(),
                urlBase + '/' + this.derivation( true ).join('/') );
        } : O.noop,

    /** */
    replaceHistory: global.history && global.history.replaceState ?
        function ( title, urlBase ) {
            return global.history.replaceState( this.data, title || this.toString(),
                urlBase + '/' + this.derivation( true ).join('/') );
        } : O.noop

});