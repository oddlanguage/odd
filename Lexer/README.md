# Odd Lexer Generator

<div align="center">
  <img src="./oddlexer.png" alt="A stylised diagram of a State-Machine, symbolising a Lexical Analyser that recognises an 'O', followed by óne or more 'D's." width=33% />
  <br/>
  <br/>
  The Odd Lexer Generator is a lexical analyser generator written in javascript.
</div>

<br/>
<br/>

## 🧠 Philosophy
To make a computer understand the vocabulary of a language, you need to tell it exactly how your words are spelt. That is where a lexical analyser (hereafter _"lexer"_) comes in: it is to a computer what the dictionary is to a human.

You could write a lexer by hand, but that reduces the flexibility and development speed of your end product (language). This is why _Lexer Generators_ are made. For the same reason the Odd Lexer Generator was made: to allow for quick and flexible language definition(s).

### Why not use existing tools?
Odd originally was a hobby project, which is a valid reason on its own. That meant that working on it had to be fun, or at least lead to a fun experience. Using existing tools was not fun. They are often old, ugly, and mix concerns that should be separated. Most lexer generators invent their own meta-version of the language it was implemented in, resulting in -- for example -- an ugly c-file that is both some form of language declaration, and a program.

<details>
<summary>An example of such a file</summary>

[Excerpt taken from WikiPedia](https://en.wikipedia.org/wiki/Flex_(lexical_analyser_generator))
```c
// This is an example of a Flex scanner for the instructional programming language PL/0.
%{
#include "y.tab.h"
%}

digit         [0-9]
letter        [a-zA-Z]

%%
"+"                  { return PLUS;       }
"-"                  { return MINUS;      }
"*"                  { return TIMES;      }
"/"                  { return SLASH;      }
"("                  { return LPAREN;     }
")"                  { return RPAREN;     }
";"                  { return SEMICOLON;  }
","                  { return COMMA;      }
"."                  { return PERIOD;     }
":="                 { return BECOMES;    }
"="                  { return EQL;        }
"<>"                 { return NEQ;        }
"<"                  { return LSS;        }
">"                  { return GTR;        }
"<="                 { return LEQ;        }
">="                 { return GEQ;        }
"begin"              { return BEGINSYM;   }
"call"               { return CALLSYM;    }
"const"              { return CONSTSYM;   }
"do"                 { return DOSYM;      }
"end"                { return ENDSYM;     }
"if"                 { return IFSYM;      }
"odd"                { return ODDSYM;     }
"procedure"          { return PROCSYM;    }
"then"               { return THENSYM;    }
"var"                { return VARSYM;     }
"while"              { return WHILESYM;   }
{letter}({letter}|{digit})* {
                       yylval.id = strdup(yytext);
                       return IDENT;      }
{digit}+             { yylval.num = atoi(yytext);
                       return NUMBER;     }
[ \t\n\r]            /* skip whitespace */
.                    { printf("Unknown character [%c]\n",yytext[0]);
                       return UNKNOWN;    }
%%

int yywrap(void){return 1;}
```
_What are these return statements and assignments doing in my definition file?_

</details>

<br/>

Even if the Odd Lexer Generator would not be faster than (or as fast as) existing tools, at least it should be vastly more intuitive and pleasureable to use (as long as you know Regular Expressions 🙃).

<br/>
<br/>

## Usage
The lexer generator is used by javascript from javascript. No weird sub- or superset.

### TL;DR

[Skip to in-depth explanation with examples ->](#in-depth-explanation)

To create a lexer you just import the API:
```js
import Lexer from "Lexer.js";

export new Lexer();
```

<br/>

The Lexer API has five methods:

<code>_Lexer_: **ignore**(_string_: **name**, (_string_|_RegExp_): **pattern**)</code>

Define a rule that, when encountered, is recognised but its result is discarded.

<br/>

<code>_Lexer_: **define**(_string_: **name**, (_string_|_RegExp_): **pattern**)</code>

Define a pattern that will never match, but can be used inside other rules with the `{rule}` syntax. A rule can be inserted in a pattern by typing that rule's name surrounded by accolades. Note that ignorations and other rules can be inserted with the same syntax, but they would produce tokens if their pattern would match. Also note that inserting a pattern will merge its flags into the receiving pattern. Any sticky (`y`) flag is ignored because it is used internally.

<br/>

<code>_Lexer_: **rule**(_string_: **name**, (_string_|_RegExp_): **pattern**)</code>

Define a rule for the lexer to recognise. Can also be referenced in other rules. The **`name`** parameter must match the regex `/[a-z]+[\-a-z]*/i` (or in English: any upper- or lowercase words separated by hyphens). The **`pattern`** parameter can be either a _string_ or a _RegExp_; strings will be converted to regular expressions, escaping all characters to their literal form.

<br/>

<code>_AsyncIterator\<Token\>_: **lex**(_ReadableStream_: **input**)</code>

Returns an `AsyncIterator` that spits out a `Token` each iteration until the end of the file. It does **not** generate an `EOF` token. If a character or lexeme is encountered that does not match any rule, it will error and tell you the source location. Multiple rules can match a single lexeme, but the longer match will be returned. If all matches are of the same length, the first match will be returned.

Quick usage example:
```js
import lexer from "my-lexer";

const tokens = lexer.lex(/*filestream*/);

for await (const token of tokens)
  console.log(token);
```

<br/>

### In-depth explanation

You create a definition file as follows:

```js
import Lexer from "Lexer";

export new Lexer()
  .ignore("whitespace", /\s+/)
  .rule("keyword",      /for|while|if|else/)
  .rule("identifier",   /[a-zA-Z][a-zA-Z0-9_]*/);
```

This javascript file defines and exports a Lexer that _recognises but ignores whitespace, recognises `for`, `while`, `if` and `else` as a keyword_ and _recognises identifiers_ by some intricate regex.

You can use string patterns too:
```js
//...
.rule("special-word", "special")
//...
```

These strings will be converted to regular expressions with all their characters escaped, so they can be referenced in other rules.

Note the use of the `ignoration` "_whitespace_". This special rule tells the lexer it should recognise the pattern, but discard its result if it were to be the best match.

Sometimes you might want to use previously defined rules in other rules:

```js
export new Lexer()
  .define("digit", /\d/)
  .rule("number", /{digit}+/)
  .rule("dimension", /{number}[kc]m/);
```

This file exports a lexer that recognises both loose numbers (such as `100`), and dimensions (numbers with units, such as `1km`, `1000m` or `100000cm`).

Note how this file uses a `definition` for a digit. This means that you can reference that definition through `{digit}` in any other rule, and you can even add quantifiers (`*` or `+`). This definition will not match anything on its own. Any other type of rule can also be inserted into another by typing that rule's name surrounded by accolades.

> Note that ignorations and other rules can be inserted with the same syntax, but they would produce tokens if their pattern would match.

> Also note that inserting a pattern will merge its flags into the receiving pattern. Any sticky (`y`) flag is ignored because it is used internally.

To use your newly defined lexer, you save the file and import it:
```js
import lexer from "my-lexer";

const tokens = lexer.lex(/*filestream*/);

for await (const token of tokens)
  console.log(token);
```

This will read your input and yield tokens which you can then use for other tasks, such as [parsing](/Parser/README.md).

Note that you have to asynchronously iterate over a file. This is because a readstream can chunk giant gigabyte files into smaller chunks, which in turn allows computers with very little RAM to lex giant files. Not everyone has enough RAM to lex your one-million-line discombobulating thruster vectoring matrix math multiplication replicator.

And that's it: all you really need to define any language's lexis.

To illustrate the power of the generator, here are a few examples of popular language vocabularies written with the Odd Lexer Generator:

<details>
<summary>JavaScript</summary>

The following is an approximation, it will not match all JavaScript files, and might match some invalid sequences.
```js
export new Lexer()
  .ignore("whitespace",     /\s+/)
  .ignore("comment",        /\/\/[^\n]*|\/\*[\s\S]*\*\//)
  .rule("string",           /(['"]).+?(?<!\\)(\1)/)
  .rule("template-literal", /`[\s\S]*(?<!\\)`/)
  .rule("storage-type",     /class|function|var|let|const/)
  .rule("this",             "this")
  .rule("constant",         /true|false|Infinity|NaN|undefined|null/)
  .rule("keyword",          /await|else|import|break|in|of|finally|return|continue|for|try|while|delete|with|async|if|yield/)
  .rule("punctuation",      /[\.\,\(\)\[\]\{\}:]/)
  .rule("operator",         /[!@%>~<&*\/\+\-=\.\?\:]+/)
  .rule("identifier",       /[$a-zA-Z][_a-zA-Z0-9]*/)
```

Note some patterns match multiple lexemes. Both punctuation and operator match `.`, but since punctuation was defined first, the lexer will yield a punctuation token. But, because of the way the rules are defined, punctuation will not match `...` while operator will.

Other special cases where a lexeme can be both depending on its context is not expressable by regular expressions, and you should not try to. Things such as `:`, which can be the delimiter to a loop label (`name: for (const a of b) {}`), a property name delimiter (`{prop: value}`) or the alternative clause to a ternary operator (`isWeird ? yep() : nope()`) should be recognised as _possibly any of them_, and be given contextual meaning in a later _parsing_ stage.

</details>

<br/>

<details>
<summary>Python</summary>

The following is an approximation, it will not match all Python files, and might match some invalid sequences.

```js
export new Lexer()
  .ignore("comment",       /#[^\n]*/)
  .rule("whitespace",      /\s+/)
  .define("string-prefix", /"r"|"u"|"R"|"U"|"f"|"F"|"fr"|"Fr"|"fR"|"FR"|"rf"|"rF"|"Rf"|"RF"/)
  .rule("string",          /{string-prefix}?(?:('''|""")[\s\S]+?(?<!\\)(\1))|(?:('|").+?(?<!\\)(\3))/)
  .rule("storage-type",    /class|lambda|def|nonlocal|global/)
  .rule("constant",        /True|False|None/)
  .rule("keyword",         /await|else|import|pass|break|except|in|raise|finally|is|return|and|continue|for|try|as|from|while|del|not|with|async|elif|if|or|yield/)
  .rule("punctuation",     /[\.\,\(\)\[\]\{\}]+/)
  .rule("operator",        /[!@%^>~:<&*\/\+\-=]+/)
  .rule("identifier",      /[a-zA-Z][a-zA-Z0-9]*/)
```

Note that because Python has significant whitespace, we cannot ignore it.

</details>