# Odd Language

<div align="center">
<img src="./logo.svg" height="150" alt="A yellowish-grey square with a thin, faint red — almost pink — grid. In the centre of this square is the word 'odd', written with an industrial design typeface with no holes in the letters, rotated to the left by 45 degrees from the centre. Every letter of the word is composed of four separated coloured parts, going from yellow-orange, to orange, to soft-red to dark crimson. Both D's of the word have ascenders that extend to the end of the square.">

_Hmm, that's **odd**..._

</div>

<br/>
<br/>

## 🧠 Philosophy

Odd is highly W.I.P. but these are the main goals of the language:

- Odd must have functional, expressive and flowing syntax.
  - Programming "patterns" are often a sign of lacking expressiveness within a language. We like a solid language over SOLID patterns.
  - Programs are read far more often than they are written. Odd should contain little to no weird jumps in program flow for readers to trip over.
- Odd must have no (unnecessary) dependencies.
  - Full ownership of the codebase ensures any bug is our responsibility to fix, but also any feature ours to add.
- Odd must run on every machine (_within reason, of course_).
  - WebAssembly is a promising target platform to immediately work on most devices.
  - A tiny footprint should allow the language to be used or embedded anywhere. Imagine your IOT devices running Odd 🤯.
  - Having an old(er) or less powerful device should never be a reason to be unable to program.

<br/>
<br/>

## 🖥️ Usage

> Odd is guaranteed to work with node version 16.13.1, but should be compatible with earlier versions down to v12, possibly requiring the `--harmony` flag.

To try out Odd, download the repo and run it through Node:

```sh
tsc # compile source
node dist/run.js # start a repl
node dist/run.js path/to/file.odd # Compile path/to/file.odd and emit to stdout
node dist/run.js path/to/file.odd out/file.ext # Compile path/to/file.odd and write to out/file.ext
```

When Odd is finished, it will be a standalone executable requiring no separate Node installation, or any other dependency.

For a more in-depth look at how Odd works, [have a look at the documentation](docs/syntax.md).

<br/>
<br/>

## 🗺️ Roadmap

Some work has yet to be done for odd to release as v1.0. The following is a list of development milestones to get to **v1.0**:

- [x] ⏱️ **0.1**: Runnable programs.
- [ ] ⏱️ **0.2**: Module system.
- [ ] ⏱️ **0.3**: Meaningful & readable errors.
- [ ] ⏱️ **0.4**: Odd LSP for proper editor integration.
- [ ] ⏱️ **0.5**: Type system (HM with row polymorphism).

> ...

- [ ] 🏁 **1.0**: Standalone executable for real-world use.

<br/>
<br/>

## 🤸 Contribute

Conceptualised and authored by ([@maanlamp](https://github.com/maanlamp)). Feel free to contribute: [create an issue](https://github.com/oddlanguage/odd/issues/new) or [a pull request](https://github.com/oddlanguage/odd/pulls).

<br/>
<br/>

## © License

Copyright 2022 ([@maanlamp](https://github.com/maanlamp)).
[This project is licensed under MIT](./LICENSE.txt).
