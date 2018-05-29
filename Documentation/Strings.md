# Strings
M uses only the _double quotes_ to signify a `string`. The reason only double quotes allowed is because it's the only unambiguous string character. A single quote can also be interpreted and used as an apostrophe. In order to support things such as contractions (which are abundant in the English language) only double quotes are permitted.

Look at the following example:
```ts
const str: s = 'It\'s a great day!';
// Ugly and unprodutive :/

const str: s = "It's a great day!";
// Objectively amazing and cool :)
```
Personally though, I'm a great fan of template literals, since they support unescaped quote characters, line breaks _and_ in-line variables.

Template literals are signified by a backtick `` ` ``
```ts
const str: s = `"It's a great day", he said.`;
// Why would anyone not use this O,o
```