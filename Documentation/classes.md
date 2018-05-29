# Classes
Classes work much like any other class system.
```ts
class Vector2 {
  public num: x = 0;
  public num: y = 0;
  public Vector2: function add (number: x, number: y = x) {
    this.x += x;
    this.y += y;
    return this;
  }
}
```
Note that when you create a class, it does not create a type, and you are strongly discouraged to create one yourself. If you want to check if a variable is an instance of a class, use the appropriately named `instanceof` operator. [Note that the parser will look if the given type is actually a class when it is not an existing type](./Types.md#declaring-custom-types).