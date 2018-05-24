# M syntax

- All expressions _must_ end with a semicolon.
- All variables must be declared with either `const` or `local`.

> const works a bit like C's `#define`. When compiled, it wil replace all occurences of that variable with a hardcoded value. In M it's to make sure it really is a constant.

- Typing can be done by preceding a variable name with "type:" (e.g. string:). `optional`
- Classes must contain a "construcotr" property, which will be invoked by calling "new Class()"
> (e.g. "new Scope()")