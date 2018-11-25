# To Do
_Here be feature propositions._ 🗺️

## ToDo Feature Format
Adding a ToDo Feature is easy and encouraged. Just provide a title, and a concise feature description.

**Any proposition in the form of a pull request will be documented in this file as well.**

Please be as code-agnostic in writing as possible: _don't think about how to solve `X` in language `Y`_, but rather _think about how to solve `X` with (human) logic, and translate that into language `Y`_.

```md
### Feature Title
_`By:`_ @author[, @contributor[, @implementor]]
##### STATUS: `Feature status.` Should be one of [Planned, Started, Done, Rejected].

Concise description of feature.

--- Seperator line for document structure preservation
```

Note that concise doesn't mean _"as brief as possible"_. It means _"as complete as possible within the confines of clarity and brevity"_.

When creating a ToDo Feature, sign your `@name` after the _`By:`_ tag. Also sign your name if you altered the proposition or implemented it. If you helped in any stage of the proposal you can consider signing also; give credit where credit is due.

---

### ~~Rewrite entire compiler architecture to be (more) modular~~
_`By:`_ @maanlamp
##### STATUS: `Done`

The old architecture does not allow scaling in any way. All features must be hacked into the code. Even the cleanest code is a chore to traverse if all you want to do is add a feature, or just update a certain part of the compiler. By transitioning to a more plugin-based architecture, we explicitly design all parts of the language as plugins, allowing for easy additions and removals, as well as a inherently easy-to-maintain structure.

---

### ~~Rewrite lexer to use modular grammar~~
_`By:`_ @maanlamp
> **STATUS:** Done

The old architecture does not allow scaling in any way. All features must be hacked into the code. Even the cleanest code is a chore to traverse if all you want to do is add a feature, or just update a certain part of the compiler. By transitioning to a more plugin-based architecture, we explicitly design all parts of the language as plugins, allowing for easy additions and removals, as well as a inherently easy-to-maintain structure.

---

### Log the correct unidentifiable lexeme when throwing an error
_`By:`_ @maanlamp
> **STATUS:** Planned

When the lexer has gone through all defined grammars but finds none, it throws an error. Currently it just says that the unidentifiable lexeme and the _enitre_ string after it are all unidentifiable. The lexeme should be cut off at a point where actually no grammar can be found.