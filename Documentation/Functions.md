# Functions
Functions are defined with the respective keyword. They are implied to return `null` unless otherwise instructed. Therefore a function that returns nothing doesn't have to be explicitly typed. Note that the parser will try to guess the type returned by the function based on its return value, so function typing is almost never necessary, unless the parser is set to strict type checking.

## Quirks mode
In [Quirks Mode](./QuirksMode), a function does not have to be preceeded by the `function` keyword. Instead, you can just omit it in for a faster and cleaner codeflow.