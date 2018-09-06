# Variables
All variables must be prefixed with either `const` or `local`. The `overt` keyword is used only in classes to signify it being open to viewing and manipulating. The reason for picking the keyword `overt` over a more standard `public` is because it is more semantically correct, and miraculously is exactly as long as `const` and `local`, which is very important to me.
```ts
const str: name = "Frank";
local int: age  = 23;
```
Declaring multiple variables in one declaration is possible.
```ts
// These declarations are the same:
const str: name1 = "Dave",
      str: name2 = "Jessica";

const str: name1 = "Dave";
const str: name2 = "Jessica";
```
When declaring class variables, the `local` keyword is assumed and thus optional. If you want the property to be constant, you would still have to declare it as such.
```ts
class Something {
  x = 1;
  //is the same as
  local x = 1;
  //but not the same as
  overt x = 1;
}
// < Something {
//     x: 1
//   }
```
Literal function expressions are implied to be `local`, but can still be declared as such:
```ts
function nil: doSomething (any: parameter) {
  // Do something
}
local function nil: doSomething (any: parameter) {
  // Do something
}
```
However, when you declare a variable with a function value you must still declare it as a `local`.
```ts
local doSomething = function nil: optionalName (any: parameter) {
  // Do something
}
```
But anyone who does this is a barbarian.

When in [Quirks Mode](./QuirksMode), there is an exception when working in classes. Functions are by default public in classes, because that is more often the desired behaviour.
```ts
class Something {
  public null: someMethod (any: parameter) {}
  // is the same as
  null: someMethod (any: parameter) {}
  // but not the same as
  local null: someMethod (any: parameter) {}
}
```
Functions are implied to return `null` unless otherwise instructed. Therefore a function that returns nothing doesn't have to be explicitly typed. Note that the parser will try to guess the type returned by the function based on its return value, so function typing is almost never necessary, unless the parser is set to strict type checking.