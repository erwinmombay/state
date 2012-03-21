( function ( undefined ) {

"use strict";

var global = this,

    // The lone dependency of the **State** module is
    // [**Zcore**](http://github.com/zvector/zcore), a library that assists with tasks such as
    // object manipulation, differential operations, facilitating prototypal inheritance, etc.
    Z = typeof require !== 'undefined' ? require('zcore') : global.Z;

// <a id="module" />

// ## state( ... )
// 
// The `state` module is exported as a function. This can be used globally, in either of two
// capacities: (1) to generate a formal `StateExpression`; or (2) to apply a new implementation of
// state, based on the supplied `expression`, to an arbitrary `owner` object, in which
// case the newly stateful owner’s initial `State` is returned.
// 
// All of the function’s arguments are optional. If both an `owner` and `expression` are provided,
// `state` acts in the second capacity, causing `owner` to become stateful; otherwise, `state`
// simply returns a `StateExpression`. The `attributes` parameter may include any of the words
// defined in `STATE_ATTRIBUTE_MODIFIERS`; these are applied to the provided `expression`, and
// will be used to further specify the expressed state’s functionality, or to impose constraints
// on how that state may be used by its owner. (See `STATE_ATTRIBUTES` object below.)
// 
// *See also:* [`State`](#state), [`StateExpression`](#state-expression),
// [`StateController`](#state-controller)
function state (
                      /*Object*/ owner,      // optional
                      /*String*/ attributes, // optional
    /*StateExpression | Object*/ expression, // optional
             /*Object | String*/ options     // optional
) {
    if ( arguments.length < 2 ) {
        typeof owner === 'string' ? ( attributes = owner ) : ( expression = owner );
        owner = undefined;
    } else {
        typeof owner === 'string' &&
            ( options = expression, expression = attributes, attributes = owner,
                owner = undefined );
        typeof attributes === 'string' ||
            ( options = expression, expression = attributes, attributes = undefined );
    }

    expression = new StateExpression( attributes, expression );

    return owner ?
        new StateController( owner, expression, options ).current() :
        expression;
}

// ### Module-level constants

// #### State attributes
// 
// These values are stored as a bit field in a `State` instance.
var STATE_ATTRIBUTES = {
        NORMAL      : 0x0,

        // A **virtual state** is a lightweight inheritor of a **protostate** located higher in the
        // owner object’s prototype chain.
        VIRTUAL     : 0x1,

        // Marking a state `initial` specifies which state a newly instantiated `StateController`
        // should assume.
        INITIAL     : 0x2,

        // Once a state marked `final` is entered, no further outbound transitions within its local
        // region are allowed.
        FINAL       : 0x4,

        // An **abstract state** cannot itself be current. Consequently a transition target that
        // points to a state marked `abstract` is redirected to one of its substates.
        ABSTRACT    : 0x8,

        // Marking a state `default` designates it as the actual target for any transition that
        // targets its abstract superstate.
        DEFAULT     : 0x10,

        // A state marked `sealed` cannot have substates.
        SEALED      : 0x20,

        // A `retained` state is one that preserves its own internal state, such that, after the
        // state has become no longer active, a subsequent transition targeting that particular
        // state will automatically be redirected to whichever of its descendant states was most
        // recently current.
        // *(Reserved; not presently implemented.)*
        RETAINED    : 0x40,

        // Marking a state with the `history` attribute causes its internal state to be recorded
        // in a sequential **history**. Whereas a `retained` state is concerned only with the most
        // recent internal state, a state’s history can be traversed and altered, resulting in
        // transitions back or forward to previously or subsequently held internal states.
        // *(Reserved; not presently implemented.)*
        HISTORY     : 0x80,

        // Normally, states that are `retained` or that keep a `history` persist their internal
        // state *deeply*, i.e., with a scope extending over all of the state’s descendant states.
        // Marking a state `shallow` limits the scope of its persistence to its immediate
        // substates only.
        // *(Reserved; not presently implemented.)*
        SHALLOW     : 0x100,

        // Causes alterations to a state to result in a reflexive transition, with a delta object
        // distinguishing the prior version of the state from its new version. Should also add a
        // history entry wherever appropriate, representing the prior version and the delta.
        // *(Reserved; not presently implemented.)*
        VERSIONED   : 0x200,

        // In a state marked `regioned`, the substates are considered **concurrent orthogonal
        // regions**. Upon entering a regioned state, the controller creates a new set of
        // subcontrollers, one for each region, which will exist as long as the regioned state
        // remains active. Method calls are forwarded to at most one of the regions, or if a
        // reduction function is associated with the given method, the call is repeated for each
        // region and the results reduced accordingly on their way back to the owner. Event
        // emissions, which have void return types, are simply propagated to all of the regions.
        // *(Reserved; not presently implemented.)*
        REGIONED    : 0x400
    },

    // The subset of attributes that are valid keywords for the `attributes` argument in a call to
    // the exported `state` function.
    STATE_ATTRIBUTE_MODIFIERS =
        'initial final abstract default sealed retained history shallow versioned regioned',
    
    // 
    STATE_EXPRESSION_CATEGORIES =
        'data methods events guards states transitions',
    
    STATE_EVENT_TYPES =
        'construct depart exit enter arrive destroy mutate',
    
    GUARD_ACTIONS =
        'admit release',
    
    TRANSITION_PROPERTIES =
        'origin source target action conjugate',
    
    TRANSITION_EXPRESSION_CATEGORIES =
        'methods events',
    
    TRANSITION_EVENT_TYPES =
        'construct destroy enter exit start end abort';

Z.env.server && ( module.exports = exports = state );
Z.env.client && ( global['state'] = state );

Z.assign( state, {
    VERSION: '0.0.3',

    noConflict: ( function () {
        var autochthon = global.state;
        return function () {
            global.state = autochthon;
            return this;
        };
    })()
});