# M syntax

## Expressions
All expressions _must_ end with a semicolon, unless it is a function or a type declaration.
```ts
// Variable
const string: name = "Jenny";

// Function
function null: doSomething (any: parameter) {
  // Do something...
}

// Type
type AlwaysTrue {
  return (this == true);
}
```

Whitespace, such as newlines or tabs, is _mostly unimportant_, but spaces between tokens are _mostly required_.
```ts
const string: name = "Abed";
// is the same as
const
  string:
    name = "Abed";
```

## Variables
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
// > Person {
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

## Types
Typing can be done by prefixing a variable name with a typename.
```ts
const boolean: mIsAwesome = true;
```
Typing is optional (unless strict type checking is enabled in the parser).
```ts
// These declarations are the same:
const any: thing = "randomString" | {} | .45 | [];
// > "randomString"
const thing = "randomString" | {} | .45 | [];
// > "randomString"
```
The compiler will be able to infer type from context, meaning the expression
```ts
local name = "John";
// is the same as
local string: name = "John";
```
to the compiler.

_Note_: When the parser checks types but finds no matching type, it wil continue to search through declared classes and check if the value is an instance of that class. Therefore types and classes can often be used interchangeably.

### Built-in types
There are some built-in types in M:
- `Anything`
  - Can be declared as: `anything` / `any`
- `Number`
  - Can be declared as: `number`   / `num`
- `Integer`.
  - Can be declared as: `integer`  / `int`
- `Decimal`.
  - Can be declared as: `decimal`  / `dec`
- `String`.
  - Can be declared as: `string`   / `str`
- `Function`.
  - Can be declared as: `function` / `func` / `fun` / `fnc` / `ƒ`
- `Boolean`.
  - Can be declared as: `boolean` / `boo` / `bool`
- `Null`.
  - Can be declared as: `null` / `nil` / `nul`
- `Object`.
  - Can be declared as: `object` / `obj` / _contentType(s)_`{}`
- `Array`.
  - Can be declared as: `array` / `arr` / _contentType(s)_`[]`

Element typing of an array _is optional_ and can be done as such:
```ts
// Within the array type brackets
const array[string]: names = ["Jimmy", "Ella", "Jaquelin"];
// > ["Jimmy", "Ella", "Jaquelin"]

//Or declaring it as a typed array directly
const string[]: names = ["Jimmy", "Ella", "Jaquelin"];
// > ["Jimmy", "Ella", "Jaquelin"]
```
_Note_: Be careful when typing your arrays. The following declaration would throw a typeError, since you
declare `things` to be either an array of strings or an array of
numbers, not an array of strings or numbers.
```ts
const string[] | number[]: namesAndAges = ["Jimmy", 24, "Ella", 12, "Jaquelin", 42];
// > typeError:  Not all elements of namesAndAges are of type
//   `string[]` or `number[]`.

const (string|number)[]: namesAndAges = ["Jimmy", 24, "Ella", 12, "Jaquelin", 42];
// > ["Jimmy", 24, "Ella", 12, "Jaquelin", 42]

const array[string|number]: namesAndAges = ["Jimmy", 24, "Ella", 12, "Jaquelin", 42];
// > ["Jimmy", 24, "Ella", 12, "Jaquelin", 42]
```
_Note_: Do not confuse declaring a typed array with declaring an array of arrays:
```ts
const array[array]: arrayOfArrays = [
  ["hey", "hello"],
  ["bye", "See ya"]
];
// is the same as
const array[]: arrayOfArrays = [
  ["hey", "hello"],
  ["bye", "See ya"]
];

const array[]: arrayOfNumbers = [1, 2, 3, 4, 5];
// > typeError: Not all elements of arrayOfNumbers are of type `array`.
```
Property typing of objects is also possible, _also optional_ and can be done as such:
```ts
// Within the object type brackets
const object{string}: names = {
  string: name1 = "Jimmy";
  string: name2 = "Ella";
  string: name3 = "Jaquelin";
};
// > names {
//     name1: "Jimmy",
//     name2: "Ella",
//     name3: "Jaquelin"
//   }

// Or declaring it as a typed object directly
const string{}: names = {
  string: name1 = "Jimmy";
  string: name2 = "Ella";
  string: name3 = "Jaquelin";
};
// > names {
//     name1: "Jimmy",
//     name2: "Ella",
//     name3: "Jaquelin"
//   }
```
_Note_: If you declare a typed object, typing of its properties is no longer necessary, and is redundant (and therefore discouraged). The parser will still trow an error if a property value is not of the type you declared to be in the given object.
```ts
const string{}: names = {
  string: name1 = "Jimmy";
  string: name2 = "Ella";
  string: name3 = "Jaquelin";
};
// is the same as
const string{}: names = {
  name1 = "Jimmy";
  name2 = "Ella";
  name3 = "Jaquelin";
};
```

### Declaring custom types
Declaring your own types is possible. To let the M-parser know you're declaring a type, you must use the `type` keyword as such:
```ts
type typeName {
  // typetest
}
```
A type declaration must contain a so-called _typetest_, which should return a boolean. The value of this boolean must signify whether a value is of the declared type. A typetest is just a term – look at it as if it were a function:
```ts
type Vector2 {
  return (this.x typeof number) & (this.y typeof number);
}
```
When you type a variable with your newly declared type (a Vector2 in this case), it will check if the assigned value passes its typetest:
```ts
// The following declaration will be fine:
const Vector2: vec = {
  number: x = 0;
  number: y = 0;
};

// The following declaration will raise a typeError:
const Vector2: vec = null;
```

### Classes
Classes work much like any other class system.
```ts
class Vector2 {
  public number: x = 0;
  public number: y = 0;
  public Vector2: function add (number: x, number: y = x) {
    this.x += x;
    this.y += y;
    return this;
  }
}
```
Note that when you create a class, it does not create a type, and you are strongly discouraged to create one yourself (such as in the Vector2 example). If you want to check if a variable is an instance of a class, use the appropriately named `instanceof` operator. [Note that the parser will look if the given type is actually a class when it is not an existing type](#types).