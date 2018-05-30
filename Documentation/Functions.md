# Functions
Functions are defined with the respective keyword.

## Anonymous functions
When declaring a function with the `function` keyword, you must give it a name. This might seem confusing (how would you create an anonimous function then?), but it is not. An anonymous function follows a slightly different syntax, borrowed from _es6_.
```ts
// Named M syntax
function num: add (num: num) {
  return num + 1;
}

// Anonymous M syntax
(num: num) => {
  num + 1;
}
// Or even shorter
num: num => num + 1;

// Or ultimately, just let the parse do the typing
num => num + 1;
```
All anonymous functions try to return the value of the last expression in their body.