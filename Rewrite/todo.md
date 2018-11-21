# To Do
_Here be feature propositions._ 🗺️

## ToDo Feature Format
Adding a ToDo Feature is easy and encouraged. Just provide a title, and a concise feature description.

Please be as code-agnostic in writing as possible: _don't think about how to solve `X` in language `Y`_, but rather _think about how to solve `X` with (human) logic, and translate that into language `Y`_.

```md
### <a name="featIndex" href="#featIndex">🔗</a> Feature Title
_`By:`_ @author[, @contributor[, @implementor]]
> **STATUS:** Feature status. Should be any of [Planned, Started, Done, Rejected].

Concise description of feature.

--- Seperator line for document structure preservation
```

Note that concise doesn't mean _"as brief as possible"_. It means _"as complete as possible within the confines of clarity and brevity"_.

When creating a ToDo Feature, sign your `@name` after the _`By:`_ tag. Also sign your name if you altered the proposition or implemented it. If you helped in any stage of the proposal you can consider signing also; give credit where credit is due.

`featIndex` should be a 1-indexed integer that's 1 higher than the previous ToDo Feature.

---

### <a name="feat1" href="#feat1">🔗</a> ~~Rewrite entire compiler architecture to be (more) modular~~
_`By:`_ @maanlamp
> **STATUS:** Done

The old architecture does not allow scaling in any way. All features must be hacked into the code. Even the cleanest code is a chore to traverse if all you want to do is add a feature, or just update a certain part of the compiler. By transitioning to a more plugin-based architecture, we explicitly design all parts of the language as plugins, allowing for easy additions and removals, as well as a inherently easy-to-maintain structure.

---

### <a name="feat2" href="#feat2">🔗</a> Rewrite lexer to use modular grammar
_`By:`_ @maanlamp
> **STATUS:** Planned

The old architecture does not allow scaling in any way. All features must be hacked into the code. Even the cleanest code is a chore to traverse if all you want to do is add a feature, or just update a certain part of the compiler. By transitioning to a more plugin-based architecture, we explicitly design all parts of the language as plugins, allowing for easy additions and removals, as well as a inherently easy-to-maintain structure.