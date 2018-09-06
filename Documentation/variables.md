# Variables
Defining a variable in Odd goes as follows:
```ts
local variable = 1;
```
Firstly a definition keyword, secondly an identifier, thirdly any assignment operator, and lastly the desired value to be stored.

There are two types of ways to store values:
- Variables
- Constants

Variables are always declared using the keyword `local`. Omitting this keyword will result in an error (except, ofcourse, in [Quirks Mode](./QuirksMode)). This isn't JavaScript, you maniac.

A constant value will not be allowed to change, but in essence it's still a variable. To create a constant you must use the `const` keyword as you would use `local`.
```ts
const constant = 1;
```
Using `const` will ensure that the stored value will never change, and if tried will throw an error.

There is another way to define a constant in Odd, but this method will be handled in the preprocessing stage, and will not ensure the value to actually stay constant. To do this, you must use the `define` keyword.
```ts
define a = 1;
```
This tells the preprocessor to swap all occurences of `a` to `1`.
```ts
define x = 10;
define y = 30;

Character.position.set(x, y);
//Will be transformed BEFORE compiling into
Character.position.set(10, 30);
```
Declaring variables within a class is the same, but has a few extras. Classes allow for local variables, but also for _overt_  or _public_ variables. Local variables will not be exposed, but _overt_ variables will.
```ts
class Vector2 () {
  local x = 0;
  overt y = 0;
}
// < Vector 2 {
//     y: 0
//   }
```
The reason for choosing the keyword `overt` instead of a more standard `public`, is because it is more semantically correct, and also perfectly aligns with `const`and `local` (which is very important to me).


Declaring multiple variables in one declaration is possible by using a _comma_ (`,`).
```ts
// These declarations are the same:
const str: name1 = "Dave",
      str: name2 = "Jessica";

const str: name1 = "Dave";
const str: name2 = "Jessica";
```

Literal function declarations must be preceded with either `local` or `const` (or `overt` in classes).
```ts
local function nil: doSomething (any: parameter) {}
//Is fine
const function nil: doSomething (any: parameter) {}
//Is fine
class Something {
  overt function nil: doSomething (any: parameter) {}
  //Is fine
}
function nil: doSomething (any: parameter) {}
//Will throw an error
```
When you store a function in a variable, you must still declare it as a `local` or `const`.
```ts
local doSomething = function nil: optionalName (any: parameter) {
  // Do something
}
```
But anyone who does this is a barbarian.

## Quirks
When declaring class variables in [Quirks Mode](./QuirksMode), the `local` keyword is assumed and thus optional. If you want the property to be constant, you would still have to declare it as such.
```ts
class Something {
  a = 1;
  //is the same as
  local b = 1;
  //sort of the same as
  const c = 1;
  //but not the same as
  overt d = 1;
}
// < Something {
//     d: 1
//   }
```
When in [Quirks Mode](./QuirksMode), literal function expressions are implied to be `local`, but can still be declared as such:
```ts
function nil: doSomething (any: parameter) {
  // Do something
}
local function nil: doSomething (any: parameter) {
  // Do something
}
```

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