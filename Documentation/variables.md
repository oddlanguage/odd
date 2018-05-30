# Variables
All variables must be prefixed with either `const`, `local` or `public` when declared. `public` is only used in classes.
```ts
const string:  name = "Frank";
local integer: age = 23;
```
Declaring multiple variables in one declaration is possible.
```ts
// These declarations are the same:
const string: name1 = "Dave",
      string: name2 = "Jessica";

const string: name1 = "Dave";
const string: name2 = "Jessica";
```
When declaring object properties or class variables, the `local` keyword is assumed and thus optional. If you want the property to be constant, you would still have to declare it as such.
```ts
const object: Person = {
  number: age = 21;
  const string: name = "Sophie";
};
// < Person {
//     age: 21,
//     name: "Sophie",
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
There is an exception when working in classes. Functions are by default public in classes, because that is more often the desired behaviour.
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