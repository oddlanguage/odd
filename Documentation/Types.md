# Types
In M, typing can be done by prefixing a variable name with [a typename](#built-in-types), followed by a colon.
```ts
const bool: mIsAwesome = true;
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

## Multiple types
You can declare anything to be able to consist out of multiple types. This can be done by encapsulating the wanted types within parenthesis, and seperated by a pipe (logical `or`).
```ts
any: function choose (...from) {
  return from[Math.floor(Math.random()*from.length)];
}
const (arr|obj): arrayOrObject = choose([], {});
```

# Built-in types
There are some built-in types in M:
| Name of type | How to declare                                                   |
|--------------|------------------------------------------------------------------|
| Anything     | `any:`                                                           |
| Number       | `num:`                                                           |
| Integer      | `int:`                                                           |
| Decimal      | `dec:`                                                           |
| String       | `str:`                                                           |
| Function     | `func:` / `fun:` / `fnc:`                                        |
| Boolean      | `bool:` / `boo:`                                                 |
| Null         | `null`  / `nil:` / `nul:`                                        |
| Object       | `obj:`  / _property type(s)_`{}:` / `obj<`_property type(s)_`>:` |
| Array        | `arr:`  / _element type(s)_`[]:`  / `arr<`_element type(s)_`>:`  |

Element typing of an array _is optional_ and can be done as such:
```ts
// Within the array type brackets
const [str]: names = ["Jimmy", "Ella", "Jaquelin"];
// > ["Jimmy", "Ella", "Jaquelin"]

//Or declaring it as a typed array directly
const str[]: names = ["Jimmy", "Ella", "Jaquelin"];
// > ["Jimmy", "Ella", "Jaquelin"]
```
Property typing of objects is also possible, _also optional_ and can be done as such:
```ts
// Within the object type brackets
const {str}: names = {
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
const str{}: names = {
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
_Note_: Be careful when typing your arrays. The following declaration would throw a typeError, since you
declare `things` to be either an array of strings or an array of
numbers, not an array of strings or numbers.
```ts
const (str[]|num[]): namesAndAges = ["Jimmy", 24, "Ella", 12, "Jaquelin", 42];
// > typeError:  Not all elements of namesAndAges are of type
//   `string[]` or `number[]`.

const (str|num)[]: namesAndAges = ["Jimmy", 24, "Ella", 12, "Jaquelin", 42];
// > ["Jimmy", 24, "Ella", 12, "Jaquelin", 42]

const [str|num]: namesAndAges = ["Jimmy", 24, "Ella", 12, "Jaquelin", 42];
// > ["Jimmy", 24, "Ella", 12, "Jaquelin", 42]
```
_Note_: Do not confuse declaring a typed array with declaring an array of arrays:
```ts
const arr[arr]: arrayOfArrays = [
  ["hey", "hello"],
  ["bye", "See ya"]
];
// is the same as
const arr[]: arrayOfArrays = [
  ["hey", "hello"],
  ["bye", "See ya"]
];

const arr[]: arrayOfNumbers = [1, 2, 3, 4, 5];
// > typeError: Not all elements of arrayOfNumbers are of type `array`.
```
_Note_: If you declare a typed object, typing of its properties is no longer necessary, and is redundant (and therefore discouraged). The parser will still trow an error if a property value is not of the type you declared to be in the given object.
```ts
const str{}: names = {
  string: name1 = "Jimmy";
  string: name2 = "Ella";
  string: name3 = "Jaquelin";
};
// is the same as
const str{}: names = {
  name1 = "Jimmy";
  name2 = "Ella";
  name3 = "Jaquelin";
};
```

# Declaring custom types
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