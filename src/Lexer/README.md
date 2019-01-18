# Odd Lexer

The lexer for Odd was built in a modular way, actually making it applicable for any language instead of Odd specifically.

Because it is a core part of Odd we do only develop it from here (for now?).

The lexer is a class with a couple of methods. It can be used by instantiating it, and molding the instance to your liking using its methods. Only one instance can be used per grammar, but you can use multiple instances to cover multiple grammars quite easily.

## Instance methods
### `.rule( string: type, regex|string: grammar )`
Registers a _grammar_ for the lexer to recognise and export as a [lexical token](./LexicalToken.js) with the according _type_. This method will return the current lexer instance so you can easily chain rule definitions.

### `.set( string: property, any: value )`
Sets instance _property_ to _value_. Used for editing instance state in a functional way. Consider this function experimental, because the implementation might change, or we might just remove the method alltogether.

### `.lex( string: input )`
This method will take an _input_ and search for grammar you declared before calling `.lex()`. It will not return the instance, but rather an array of [lexical tokens](./LexicalToken.js). If the lexer comes across a lexeme (combination of characters) it cannot recognise, an error will be thrown logging the exact location of the error, and the causing lexeme.

## Usage
A lexer instance does not work without declaring rules first. To do so, use the `.rule()` method. This method takes two arguments: typename and grammar. The typename determines the type of the generated token coming from the lexer, and the grammar is a string or RegExp that contains the pattern for the lexer to recognise. The `.rule()` method returns the current lexer instance, so you can chain them.

A simple lexer to differentiate between text and whitespace could look as follows:

```js
const Lexer = require("Lexer");
const lexer = new Lexer()
  .rule("whitespace", /\s+/)
  .rule("text", /\w+/);
```

The lexer Odd uses internally is built the same way, but has much more rules declared.