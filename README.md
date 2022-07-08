# Odd Language

<div align="center">
<img src="./logo.svg" height="150" alt="A yellowish-grey square with a thin, faint red — almost pink — grid. In the center of this square is the word 'odd', written with an industrial design typeface with no holes, rotated to the left by 45 degrees from the centre. Every letter of the word is composed of four separated coloured parts, going from yellow-orange, to orange, to soft-red to dark crimson. Both D's of the word have ascenders that extend to the end of the square.">

_Hmm, that's **odd**..._

</div>

<br/>
<br/>

## 🧠 Philosophy

Odd is highly W.I.P. but these are the main goals of the language:

- Odd must have functional, expressive and flowing syntax.
  - Programming "patterns" are often a sign of lacking expressiveness within a language. We like a solid language over SOLID principles.
  - Programs are read far more often than they are written. Odd should contain little to no weird jumps in program flow for readers to trip over.
- Odd must have no (unnecessary) dependencies.
  - It's fine to call it _"reinventing the wheel"_, but in reality Odd doesn't need [an ASCII art of Guy fiery in some dependency's dependency](https://medium.com/s/silicon-satire/i-peeked-into-my-node-modules-directory-and-you-wont-believe-what-happened-next-b89f63d21558), or any other useless import for that fact.
- Odd must run on every machine (_within reason, of course_).
  - A tiny footprint should allow the language to be used and embedded anywhere. Imagine your IOT devices running Odd 🤯.
  - Having an old(er) or less powerful device should never be a reason to be unable to program.

<br/>
<br/>

## 🖥️ Usage

> Odd is guaranteed to work with node version 16.13.1, but should be compatible with earlier versions down to v12, possibly requiring the `--harmony` flag.

To try out Odd, download the repo and run it through Node:

```shell
tsc # compile source
node dist/run.js # start a repl
node dist/run.js path/to/file.odd # or run the compiler on path/to/file.odd
```

When Odd is finished, it will be a standalone executable requiring no separate Node installation, or any other dependency.

<br/>
<br/>

## 🗺️ Roadmap

Some work has yet to be done for odd to release as v1.0. The following is a list of development milestones to get to **v1.0**:

- [ ] ✅ **0.1**: Runnable programs.
- [ ] ⏱️ **0.2**: Type system (HM with row polymorphism).
- [ ] ⏱️ **0.3**: Module system.
- [ ] ⏱️ **0.4**: Meaningful & readable errors.
- [ ] ⏱️ **0.5**: Odd LSP for proper editor integration.
  > ...
- [ ] 🏁 **1.0**: Standalone executable for real-world use.

<br/>
<br/>

## 🤸 Contribute

Conceptualised and authored by ([@maanlamp](https://github.com/maanlamp)). Feel free to contribute: [create an issue](https://github.com/oddlanguage/odd/issues/new) or [a pull request](https://github.com/oddlanguage/odd/pulls).

<br/>
<br/>

## © License

Copyright 2021 ([@maanlamp](https://github.com/maanlamp)).
[This project is licensed under MIT](./LICENSE.txt).
