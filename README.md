<img src="./icon.png" style="display: block; width: 8rem;" />
<br/>
<br/>

Conceptualised and authored by [@maanlamp](https://github.com/maanlamp).

#### Hmm, that's odd...

# What is odd?
Odd was created with love for language, and not just for programming languages. Odd smushes together all the things I find to be best practises, grammar and syntax, while maintaining a more verbally heavy design in comparison to other languages (if it's a language, should it not flow as if you were to speak it?). Alltogether I think this makes a more easy-to-understand, easy-to-use yet very powerful language.

<br/>

---

<br/>

## How to use Odd

### Lexer
Currently, only the lexical analyser is fully functional (but might miss some edge cases).

A lexer instance does not work without declaring rules first. To do so, use the `.rule()` method. This method takes two arguments: `typename` and `grammar`. The _typename_ determines the type of the generated token coming from the lexer, and the _grammar_ is a string or RegExp that contains the pattern for the lexer to recognise. The `.rule()` method returns the current lexer instance, so you can chain them.

The internally defined Odd lexer has the following rules, defined as such:
```js
const Lexer = require("./Lexer");

const lexer = new Lexer()
  .rule("whitespace", /\s+/)
  .rule("single line comment", /\/\/[^\n]*/)
  .rule("expression terminator", ";")
  .rule("type annotation", /[\[\]}{]?[a-zA-Z_$][\w$]*[\[\]}{]{0,2}:/)
  .rule("punctuation", /[,\[\]\(\)}{]/)
  .rule("operator", /[.=+\-/*%^~<>?&|!:]/)
  .rule("number", /[\d.][\deE.]*/)
  .rule("string", /(?<!\\)".*"/)
  .rule("template literal", /(?<!\\)`.*`/)
  .rule("preprocessor directive", /#/)
  .rule("identifier", /[a-zA-Z_$][\w$]*/);
```

<br/>

---

<br/>

## Documentation
[Read the documentation here.](./Documentation)

<br/>

---

<br/>

## Contributing
Contributions are welcome! [Read up on how to propose and/or implement a feature.](./todo.md)

<br/>

---

#### License
[MIT](./LICENSE) © [maanlamp](https://github.com/maanlamp)