# Expressions
All expressions _must_ end with a semicolon, unless it is a function, a class or a type declaration.
```ts
// Variable
const str: name = "Jenny";

// Function
function null: doSomething (any: parameter) {
  // ...
}

// Type
type AlwaysTrue {
  return (this == true);
}

// Class
class Vector2 {
  // ...
}
```
Whitespace, such as newlines or tabs, is _mostly unimportant_, but spaces between tokens are _mostly required_.
```ts
const str: name = "Abed";
// is the same as
const
  str:
    name
      =
        "Abed";
```