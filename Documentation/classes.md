# Classes
Classes work much like any other class system.
```ts
class Vector2 (int: x = 0, int: y = x) {
  public num: x = x;
  public num: y = y;
  public Vector2: function add (number: x, number: y = x) {
    this.x += x;
    this.y += y;
    return this;
  }
}
```
Note that when you create a class, it does not create a type, and you are strongly discouraged to create one yourself. If you want to check if a variable is an instance of a class, use the appropriately named `instanceof` operator. [Note that the parser will look if the given type is actually a class when it is not an existing type](./Types.md#declaring-custom-types).

## Operator metamethods
You can tell the odd parser what to do when you apply an operator to a class. To do this, you must declare a _metamethod_ for it. A metamethod is declared with the keyword [`meta`](./Metamethods.md), followed by the operator(s) that should invoke this metamethod. The arguments to this metamethod will be the operators operands.
```ts
class Vector2 {
  public num: x = 0;
  public num: y = 0;
  meta + (any: other) {
    if (other instanceof Vector2) {
      return new Vector(x + other.x, y + other.y);
    }
  }
}

console.log(
  new Vector2(100, 50) + new Vector2(25, 75)
);
// < Vector2 {
//     x: 125,
//     y: 125
//   }
```
I don't really like the way I've decided this (How would you declare one metamethod for multiple operators?). Feedback is much appreciated.