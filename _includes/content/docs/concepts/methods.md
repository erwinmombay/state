### [Methods](#concepts--methods)

A core feature of **State** is the ability for an object to exhibit any of multiple well-defined behaviors. This is achieved with **state methods**, which may override or augment the methods of a `State`’s **owner** anytime that `State` is *current* or *active*.

<div class="local-toc"></div>



#### [Dispatchers](#concepts--methods--dispatchers)

When applied to an owner object by calling [`state()`](#getting-started--the-state-function), **State** first identifies any methods already present on the owner for which there exists at least one override somewhere within the provided state expression, and relocates these methods to the new [root state](#concepts--object-model--the-root-state). For all state methods, a special **dispatcher** method is then instated on the owner at the corresponding key.

The dispatcher’s job is to redirect all invocations to the owner’s current state, from which **State** will then locate and invoke the proper stateful implementation of the method. If no active states contain an implementation for the invoked method, the invocation will be forwarded to the owner’s original implementation of the method, if one exists, or will cause a [`noSuchMethod`](#concepts--methods--nonexistent) [**event**](#concepts--events) otherwise.

{% highlight javascript %}
{% include examples/docs/methods--dispatchers.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--dispatchers.coffee %}
{% endhighlight %}

###### SEE ALSO

> [`State createDispatcher`](/source/state.html#state--private--create-dispatcher)
> [`State::addMethod`](/source/state.html#state--prototype--add-method)



#### [Method context](#concepts--methods--context)

By default, state methods are invoked just like normal methods, in the context of the **receiving owner**.

However, certain methods may require awareness of the `State` from which it is called, for example, to delegate to a [superstate](#concepts--object-model--superstates-and-substates)’s implementation of a method. This can be expressed by wrapping a method’s function expression in a call to [`state.bind`](/api/#state-function--bind), which causes the method to be invoked in the context of the receiving `State` instead of the receiving owner. This exposes reliable references to `this.superstate`, `this.root`, and any other relative location in the receiving owner’s state tree, along with, importantly, the owner itself via `this.owner`.

In this way delegation to a superstate’s method is facilitated by the `apply` and `call` methods of `State`:

{% highlight javascript %}
{% include examples/docs/methods--context.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--context.coffee %}
{% endhighlight %}

Worth noting here is the significant difference distinguishing these `apply` and `call` methods from their familiar `Function.prototype` counterparts: whereas for a function, the first argument accepted by `apply` and `call` is a context object, for the `State::apply` and `State::call` methods, the first argument is a string that names a method on that state to be invoked.

###### SEE ALSO

> [state.bind](/api/#state-function--bind)
> [method](/api/#state--methods--method)
> [apply](/api/#state--methods--apply)
> [call](/api/#state--methods--call)

> [`state.bind`](/source/state-function.html#state-function--bind)
> [`State::method`](/source/state.html#state--prototype--method)
> [`State::apply`](/source/state.html#state--prototype--apply)
> [`State::call`](/source/state.html#state--prototype--call)



#### [Lexical bindings](#concepts--methods--lexical-bindings)

A state method may require awareness of the precise `State` in which it is defined, which is necessary for introspection and delegation along the [protostate axis](#concepts--object-model--protostates-and-epistates).

This can be expressed by enclosing a method’s function expression in a decorator, and passing this to [`state.fix`](/api/#state-function--fix) — a pattern that **lexically binds** additional `State` context into the method.

{% highlight javascript %}
{% include examples/docs/methods--lexical-bindings.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--lexical-bindings.coffee %}
{% endhighlight %}

Decoration via `fix` provides the state-lexical references:

* `autostate` : the precise `State` in which the method is defined.
* `protostate` : the protostate of `autostate`.

Should a function require insight into both its calling context and its state-lexical environment, this can be composed neatly with both `fix` and `bind`:

{% highlight javascript %}
{% include examples/docs/methods--fix-bind.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--fix-bind.coffee %}
{% endhighlight %}

In such a case the distinction and relationship between `autostate` and `this` is important: if a function is inherited from a protostate, then `autostate` will accordingly be a protostate of `this`; if the function is not inherited, then `autostate` and `this` are identical.

###### SEE ALSO

> [state.fix](/api/#state-function--fix)
> [`state.fix`](/source/state-function.html#state-function--fix)



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

###### SEE ALSO

> [noSuchMethod](/api/#state--events--no-such-method)
> [noSuchMethod:name](/api/#state--events--no-such-method-name)
> [apply](/api/#state--methods--apply)
> [`State::apply`](/source/state.html#state--prototype--apply)



#### [Examples](#concepts--methods--examples)

These examples demonstrate some of the patterns of state method inheritance. Note the points of interest numbered in the trailing comments and their explanations below:

##### [Document](#concepts--methods--examples--document)

{% highlight javascript %}
{% include examples/docs/methods--examples-0.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--examples-0.coffee %}
{% endhighlight %}

{% include captions/docs/methods--examples-0.md %}

##### [Shooter](#concepts--methods--examples--shooter)

{% highlight javascript %}
{% include examples/docs/methods--examples-1.js %}
{% endhighlight %}

{% highlight coffeescript %}
{% include examples/docs/methods--examples-1.coffee %}
{% endhighlight %}

{% include captions/docs/methods--examples-1.md %}


<div class="backcrumb">
⏎  <a class="section" href="#concepts--methods">Methods</a>  &lt;  <a href="#concepts">Concepts</a>  &lt;  <a href="#overview">Overview</a>
</div>