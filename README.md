<img src="./icon.png" style="display: block; width: 8rem;" />

#### _Hmm, that's odd..._

Conceptualised and authored by [@maanlamp](https://github.com/maanlamp).

<br/>

# What is odd?

Odd was created with love for language, and not just for programming languages. Odd smushes together all the things I find to be best practises, grammar and syntax, while maintaining a more verbally heavy design in comparison to other languages (if it's a language, should it not flow as if you were to speak it?). Alltogether I think this makes a more easy-to-understand, easy-to-use yet powerful language.

<br/>

## Usage
To run the odd compiler, you need to run `index.js` with node v11.6 or higher. Open your cli of choice and run
```shell
node . #You need to `cd` into the odd directory for this to work.
```

<br/>

## Modules
Odd was designed with modularity in mind, so all parts of the compiler were written separately. Find them and their READMEs in their respective folders:

- [The lexical analyser](./Lexer)
- [The lexical preprocessor](./Preprocessor)
- [The parser](./Parser)
- [The compiler](./Compiler)
- [Custom errors](./Errors)

<br/>

## VSCode language extension
You can already [try out the look of the language within Visual Studio Code](./VSCode%20language%20extension) with the extension we made. It is still in heavy development along with the language itself, but we use it to develop the language.

<br/>

## Contributing
Odd is open-source, therefore contributions are welcome! [Read up on how to propose and/or implement a feature.](./contribute.md)

<br/>
<br/>

---

#### License
[MIT](./LICENSE) © [maanlamp](https://github.com/maanlamp)