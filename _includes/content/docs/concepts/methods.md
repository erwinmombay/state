### [Methods](#concepts--methods)

A defining feature of **State** is the ability for an object to exhibit a variety of behaviors. A state expresses a particular behavior with **state methods** that override or augment its **owner** object’s methods.

<div class="local-toc"></div>



#### [Dispatchers](#concepts--methods--dispatchers)

When applied to an owner object by calling [`state()`](#getting-started--the-state-function), **State** first identifies any methods already present on the owner for which there exists at least one override somewhere within the provided state expression, and relocates these methods to the new [root state](#concepts--inheritance--the-root-state). Then, for all state methods, a special **dispatcher** method is instated on the owner.

The dispatcher’s job is to redirect all invocations to the owner’s current state, from which **State** will then locate and invoke the proper stateful implementation of the method. If no active states contain an implementation for the invoked method, the delegation will default to the owner’s original implementation of the method, if one exists, or result in a [`noSuchMethod`](#concepts--methods--nonexistent) [**event**](#concepts--events) otherwise.

{% highlight javascript %}
{% include examples/docs/methods--dispatchers.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--dispatchers.coffee %}
{% endhighlight %}

###### See also

> [`State createDispatcher`](/source/#state--private--create-dispatcher)
> [`State::addMethod`](/source/#state--prototype--add-method)



#### [Method context](#concepts--methods--context)

By default, state methods are invoked like a normal method, in the context of the owner or inheritor thereof which they serve.

A method may also require awareness of the `State` from which it is called, for example, to delegate to a superstate’s implementation of a method. This can be expressed by wrapping a method’s function expression in a call to `state.bind`, which causes the method to be invoked in the context of the `State` rather than the owner. This exposes reliable references to `this.superstate`, `this.root`, and other locations in the state tree. Importantly, the owner object is still available indirectly by referencing `this.owner`.

In this way delegation to a superstate’s method is facilitated by the `apply` and `call` methods of `State`:

{% highlight javascript %}
{% include examples/docs/methods--context.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--context.coffee %}
{% endhighlight %}

Worth noting here is the significant difference distinguishing these `apply` and `call` methods from their familiar `Function.prototype` counterparts: whereas for a function, the first argument accepted by `apply` and `call` is a context object, for the `State::apply` and `State::call` methods, the first argument is a string that names a method on that state to be invoked.

###### See also

> [state.bind](/api/#state-function--bind)
> [method](/api/#state--methods--method)
> [apply](/api/#state--methods--apply)
> [call](/api/#state--methods--call)

> [`state.bind`](/source/#state-function--bind)
> [`State::method`](/source/#state--prototype--method)
> [`State::apply`](/source/#state--prototype--apply)
> [`State::call`](/source/#state--prototype--call)



#### [Lexical bindings](#concepts--methods--lexical-bindings)

A state method may require awareness of the precise `State` in which it is defined, which is necessary for introspecting and inheriting along the **protostate** axis.

This can be expressed by enclosing a method’s function expression in a combinator which is then wrapped in a call to `state.fix` — a pattern that **lexically binds** additional `State` context into the method.

{% highlight javascript %}
{% include examples/docs/methods--lexical-bindings.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--lexical-bindings.coffee %}
{% endhighlight %}

The state-lexical references gained by methods transformed by `fix` are:

* `autostate` : the precise `State` in which the method is defined.
* `protostate` : the protostate of `autostate`.

Worth noting here is the distinction and relationship between `autostate` and `this`: if a method is inherited from a protostate, then `autostate` will reference that protostate of `this`; if the method is not inherited, then `autostate` and `this` are identical.

###### See also

> [state.fix](/api/#state-function--fix)
> [`state.fix`](/source/#state-function--fix)

> [Lexical bindings in state methods](/blog/#lexical-bindings-in-state-methods)



#### [Handling calls to currently nonexistent methods](#concepts--methods--nonexistent)

In the case of an attempt to `call` or `apply` a state method that does not exist within that state and cannot be inherited from any protostate or superstate, the invocation will act as a no-op, returning `undefined`.

**State** allows such a contingency to be trapped by emitting a generic [`noSuchMethod`](/api/#state--events--no-such-method) [**event**](#concepts--events). Listeners take as arguments the name of the sought method, followed by an `Array` of the arguments provided to the failed invocation.

Also emitted is a specific [`noSuchMethod:name`](/api/#state--events--no-such-method-name) event, which includes the `name` of the sought method. Listeners of this event take the individual arguments as they were provided to the failed invocation.

{% highlight javascript %}
{% include examples/docs/methods--nonexistent.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--nonexistent.coffee %}
{% endhighlight %}

###### See also

> [noSuchMethod](/api/#state--events--no-such-method)
> [noSuchMethod:name](/api/#state--events--no-such-method-name)
> [apply](/api/#state--methods--apply)
> [`State::apply`](/source/#state--prototype--apply)



#### [Example](#concepts--methods--example)

This example of a simple `Document` demonstrates some of the patterns of state method inheritance. Note the points of interest numbered in the trailing comments and their explanations below:

{% highlight javascript %}
{% include examples/docs/methods--example.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--example.coffee %}
{% endhighlight %}

{% include captions/docs/methods--example.md %}

<div class="backcrumb">
⏎  <a class="section" href="#concepts--methods">Methods</a>  &lt;  <a href="#concepts">Concepts</a>  &lt;  <a href="#overview">Overview</a>
</div>