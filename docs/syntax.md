# Odd Syntax

This document describes the Odd syntax. It is a live document and is not a formal specification in any way.

<br/>

<details>
  <summary><b>📚 Table of Contents</b></summary>

- [Odd Syntax](#odd-syntax)
  - [Comments](#comments)
  - [Literals](#literals)
    - [Booleans](#booleans)
    - [Nothing](#nothing)
    - [Numbers](#numbers)
      - [Legibility](#legibility)
      - [Decimal](#decimal)
      - [Exponent](#exponent)
      - [Infinity](#infinity)
    - [Strings](#strings)
      - [Interpolation](#interpolation)
      - [Common pitfalls in strings](#common-pitfalls-in-strings)
    - [Names](#names)
      - [Common pitfalls in names](#common-pitfalls-in-names)
    - [Lists](#lists)
    - [Records](#records)
    - [Operators](#operators)
      - [Precedence](#precedence)
      - [Application](#application)
    - [Lambdas](#lambdas)
  - [Assignment](#assignment)
  - [Application](#application-1)
  - [Pattern matching](#pattern-matching)
    - [Case expressions](#case-expressions)
    - [Patterns in declarations](#patterns-in-declarations)
    - [Lambdas](#lambdas-1)
  - [Modules](#modules)
  - [Functions](#functions)
  - [Types](#types)
- [🤸 Contribute](#-contribute)

</details>

<br/>
<br/>

## Comments

You can write a comment by typing two dashes (--) followed by any character, up until a newline:

```hs
-- This is a comment.
```

Comments are legal anywhere whitespace is allowed, meaning pretty much anywhere:

```hs
a b c =
  -- Do something with `b` and `c`
  do-something b c;
```

There are no multiline comments.

<br/>
<br/>

## Literals

A `literal` is a lexeme that represents a value _literally_. Below are all possible literal productions, ordered by simplicity.

<br/>

### Booleans

Odd features two values that represent truth and falsehood: `true` and `false`, respectively.

```hs
infinity > 1 -- true
1 == ''1''-- false
```

### Nothing

It's really useful to be able to say something holds no value, instead of crashing and burning. There's a special literal for this case: `nothing`. It behaves somewhat like `null` would in other c-like languages.

> ℹ️ It behaves _only somehwat_ like it. [_The billion dollar mistake_](https://www.infoq.com/presentations/Null-References-The-Billion-Dollar-Mistake-Tony-Hoare/) is not repeated. Only `nothing` can be `nothing`, no other value can inhabit its type.

Nothing is equal to `nothing`, except itself:

```hs
nothing == nothing -- true
1 == nothing -- false
```

> ℹ️ When the type system is implemented, union types will allow you to express optionality by unioning the types: `x : Number | Nothing`.

### Numbers

A number is any string of consecutive digits:

```hs
1;
10;
123456789;
```

#### Legibility

To increase the legibility of a number, you can insert a _comma_ (`,`) anywhere between digits:

```hs
1000000;
-- is the same as
1,000,000;
```

#### Decimal

Decimal numerals are denoted with a _full stop_ (`.`) to separate the integral and decimal parts:

```hs
1.5;
372.8738;
```

The integral part is optional:

```hs
0.123456789;
-- is the same as
.123456789;
```

You cannot insert commas after the full stop:

```hs
1,000.03534 -- ok!
1.033,534 -- ERROR!
```

#### Exponent

A number can contain an exponent, delimited by _the letter e_ (case-insensitive):

```hs
1e6;
-- is the same as
1E6;
-- is the same as
1,000,000;
```

The exponent is assumed to be positive, but can be explicitly marked as such:

```hs
1e6;
-- is the same as
1e+6;
```

The exponent can also be negative:

```hs
1e-6;
-- is the same as
0.000001;
-- is the same as
.000001;
```

#### Infinity

There is a special literal in Odd that represents a number greater than any other number, named `infinity`. This is also the case for `-infinity`, which is always smaller than any other number.

Of course, infinity isn't a number but let's pretend 😉.

<br/>

### Strings

A string is a sequence of any character (except newlines), contained within _two single apostrophes_ (`''`):

```hs
''This is a string!'';
```

> ℹ️ Multiline strings are a planned feature, and will use the same syntax.

#### Interpolation

> ℹ️ String interpolation is a planned feature. It will use the backslash (`\`) to denote interpolated parts.

#### Common pitfalls in strings

The reason Odd uses this syntax is to avoid common pitfalls of strings in other languages.

Strings often contain quotes themselves, requiring multiple string delimiters, or escaping mechanisms:

```js
// JavaScript
"Daniel's dog is named \"Bert\"";
'Daniel\'s dog is named "Bert"';
```

In Odd, you don't have to escape any quote, nor do you need to switch delimiters to fit your needs:

```hs
''Daniel's dog is named "Bert"'';
```

The reason we chose to use double apostrophes, is because they are available and easily typeable for most people around the world, unlike alternatives such as the _backtick_ (`` ` ``).

<br/>

### Names

A _name_ — often called an _identifier_ in other languages — is _a case-insensitive sequence of any letter and number, beginning with a letter:_

```hs
name;
name2;
```

> ℹ️ For those who can read it, it's recognised with the following regex:
>
> ```
> /[a-z]+\w*(?:-\w+)*/i
> ```

To separate words within a name, you can use _hyphens_ (`-`):

```hs
this-is-also-a-name;
```

The way we separate words in a name is often called _kebab case_, because of the resemblance to kebab on a skewer.

Odd supports kebab case because it's more legible than _camelCase_ or _PascalCase_, and requires fewer key presses than _snake_case_. While camelCasing your variables is still possible, the official Odd styleguide requires kebab-case.

#### Common pitfalls in names

Because the hyphen character is also used for the minus operator, one might get confused between `a-name` and `an - expression`. In practise, people mostly put spaces between terms and operators in their maths, so it's easily distinguishable.

This requirement does prevent some code minification, but it's not desirable to send source files over the wire; compiled programs are preferred.

<br/>

### Lists

In Odd, you can group several values into a single value by wrapping it in a _list_. A list consists of _an opening square bracket (`[`), followed by zero or more expressions delimited by a comma (`,`), followed by a closing square bracket (`]`)_:

```hs
[]; -- empty list

[this, is, a, list, of, names];

[ any-value-is-allowed,
  3456,
  10 * .3,
  ''string'',
  x -> y,
  [ lists-in-lists,
    are-also-allowed ] ];
```

A list can contain a _dangling comma_.

To merge two lists _literally_, you can destructure them:

```hs
-- given two lists
a = [1,2,3];
b = [4,5,6];

-- the destructuring
[ ...a,
  ...b ]

-- is equal to
[1,2,3,4,5,6];
```

<br/>

### Records

In Odd, you can categorise several values into a single value by wrapping it in a _record_. A record consists of _an opening accolade (`{`), followed by zero or more fields delimited by a comma (`,`), followed by a closing accolade (`}`)_.

Fields are optional:

```hs
{}; -- empty record
```

Fields have several forms. A field can be named with a `name`, followed by an equals sign (`=`) and then an expression:

```hs
{ name = value,
  another-name = another-value };
```

A record can contain a _dangling comma_:

```hs
{
  a = b,
  c = d, -- <-
};
```

A field can also be a function:

```hs
{ mult a b = a * b };
```

If there exists a variable `var` in the current scope, a record can be assigned a field with the name `var` and the value of `var`:

```hs
{ var };
-- is the same as
{ var = var };
```

> ℹ️ Dynamic field names are a planned feature, which will use the string syntax.

To merge two records _literally_, you can destructure them:

```hs
-- given two records
x = {
  a = 1,
  b = 2,
  c = 3 };
y = {
  d = 4,
  e = 5,
  f = 6 };

-- the destructuring
destructured = {
  ...x,
  ...y,
};

-- is equal to
handwritten = {
  a = 1,
  b = 2,
  c = 3,
  d = 4,
  e = 5,
  f = 6,
};

-- as proven by
destructured == handwritten -- yields true
```

<br/>

### Operators

Most non-letter characters are treated as operators. Multiple non-letter characters in a row are recognised as one operator:

```hs
multiply = (*);
divide = (/);
fish = (><>);
brainfuck = (+<>-+>-);
```

> ℹ️ For those who can read it, operators are recognised with the following regex:
>
> ```
> /[-!@#$%^&*_+=:\|\/\\\.\<\>\?]+/
> ```
>
> _Operators such as `->` and `=` are special and cannot be overwritten._

The Odd prelude defines often-used operators in global scope.

An operator is placed between two expressions:

```hs
a + b;
```

#### Precedence

_All operators have the same precedence and associativity_, **_even common mathematical ones!_**. This means all infix expressions are evaluated left-to-right.

```hs
1 + 2 * 3; -- Forget what shool has taught you, it's 9
-- because it's the same as
(1 + 2) * 3; -- also 9
```

This might cause confusion for some at first, but this actually prevents program errors caused by imperfect knowledge of all operators and their respective precedences/associativities.

To motivate this decision, consider the following example. One might write expressions such as:

```hs
a @@ b </> c % d;
```

Can you see — at first glance — in what order this expression is evaluated? Why, yes! _Left-to-right_, like any other infix expression in Odd. You don't need intimate knowledge of the operators to know how the expression flows.

Mathematical operators hold no special distinction, so they are also stripped of their precedence and associativity rules.

To change the order of operations, you can use parentheses:

```hs
a @@ b </> c ## d;
-- is the same as
((a @@ b) </> c) ## d;
-- but not the same as
a @@ (b </> c) ## d;
```

To improve reading comprehension, dense infix expressions are often already redundantly parenthesised in programs in other languages. All operators having the same precedence and associativity means that Odd "enforces" clarity through parentheses.

#### Application

Because operators are values, they can also be used in application:

```hs
(-) 2 3;
-- is the same as
3 - 2;
```

Note the order of the operands. This order is more akin to how people think about partial application than if they were reversed:

```hs
subtract-one = (-) 1;
subtract-one 3 -- yields 2
```

Whereas the opposite doesn't make sense unless you use a different function name:

```hs
subtract-x-from-1 = (-) 1;
subtract-x-from-1 3 -- would yield -2 if the operands were reversed
```

An operator literal requires parentheses (`()`) around it if not in infix notation.

[They can be used in assignments too](#assignment), which we will expand upon later.

<br/>

### Lambdas

In Odd you can write nameless functions that are values themselves. These are often called _lambdas_, because the idea stems from [the lambda calculus](https://en.wikipedia.org/wiki/Lambda_calculus), which denotes functions with the lambda character (`λ`).

Lambdas in Odd are denoted by an arrow (`->`) between parameters and body:

```hs
param -> body;
```

Functions can have multiple parameters, and so can lambdas:

```hs
a b c -> a - b + c;
```

To prevent the parser getting confused over which values are parameters in an application, you can use parentheses:

```hs
-- A lambda with two parameters `a` and `b`
a b -> c;

-- Application of `a` to `b -> c`
a (b -> c);
```

<br/>

## Assignment

You can assign a value to a name using the _equals sign_ (`=`):

```hs
a = b;
```

Odd values are immutable:

```hs
a = b;
a = c; -- ERROR! Can't redeclare `a`.
```

A function can be declared with the same syntax:

```hs
multiply a b = a * b;
```

> ℹ️ [We will expand upon function syntax later on](#application).

<br/>
<br/>

## Application

Function application in Odd is done by _juxtaposition_:

```hs
f x;
```

This syntax allows for more natural notation of data transformation.

This differs from many C-like languages and math notation:

```js
f(x);
```

One could think of these syntaxes as the same, but without requiring parentheses (the c-like syntax is also legal syntax in Odd).

<br/>
<br/>

## Pattern matching

Patterns allow you to match data by its value or shape.

<br/>

### Case expressions

With a `case` expression, you can couple values together based on any pattern.

A case expression consist of the word `case`, followed by _a literal (numbers, strings, names, etc.), or an expression between paretheses_ `()`, followed by the word `of`, followed by one or more _cases_:

```hs
two-is-even = case (is-even 2) of
  true = ''yep'',
  false = ''nope'';

two-is-even; -- ''yep''
```

A case consists of _a pattern_, followed by _an equals sign_ (`=`), followed by _an expression_.

Here are some valid patterns:

- Literals, such as
  - Strings
  - Numbers
  - Booleans
  - etc.

```hs
case ''a'' of
  1 = 1, -- no match
  true = 2, -- no match
  ''a'' = 3; -- match!
-- final result is 3
```

- The _success_ case, which is one or more underscores (`_`), and always matches.

```hs
case ''a'' of
  1 = 1, -- no match
  true = 2, -- no match
  _ = 3; -- match!
-- final result is 3
```

The order of cases is important. They are evaluated top to bottom / left to right:

```hs
case ''a'' of
  1 = 1, -- no match
  true = 2, -- no match
  ''a'' = 3, -- match!
  _ = 4; -- also a match, but will not
         -- be chosen since it comes
         -- after another matching pattern
-- final result is 3
```

<br/>

### Patterns in declarations

You can also destructure values in a declaration.

For example, you can destructure specific properties from a record parameter as follows:

```hs
daniel = {
  name = ''Daniel'',
  age = 20,
  occupation = ''Steward'',
};

get-name { name } = name;

get-name daniel -- ''Daniel''
```

The same applies to lists:

```hs
names = [
  ''Daniel'',
  ''Baernhardt'',
  ''Molly'',
  ''Iseabail'',
];

head [first] = first;

head names -- ''Daniel''
```

You can destructure specific elements and wrap up the rest into another name:

```hs
-- lists
[a, ...b] = [1, 2, 3];
a -- yields 1
b -- yields [2, 3]

-- records
{a, ...b} = {a = 1, x = 2, y = 3};
a -- yields 1
b -- yields {x = 2, y = 3}
```

Patterns work recursively:

```hs
-- lists
[[[x]]] = [[[1]]];
x -- yields 1

-- records
{a={b={c}}} = {a={b={c=1}}};
c -- yields 1
```

<br/>

### Lambdas

Because function declarations are sugar for writing lambdas, the same pattern matching is possible in lambdas:

```hs
people = [
  {
    name = ''Daniel'',
    age = 20,
    occupation = ''Steward'',
  },
  {
    name = ''Bearnhardt'',
    age = 53,
    occupation = ''Medieval Knight'',
  },
  {
    name = ''Molly'',
    age = 41,
    occupation = ''Stewardess'',
  },
  {
    name = ''Iseabail'',
    age = 19,
    occupation = ''Nurse'',
  },
];

-- yields [
--   ''Daniel'',
--   ''Baernhardt'',
--   ''Molly'',
--   ''Iseabail'',
-- ];
names = map ({name} -> name) people;
```

<br/>
<br/>

## Modules

Any file can be imported into another file or repl by using the `import` function:

```hs
module = import ''module''
```

No special syntax for importing, you just assign it to a name.

A module cannot explicitly mark a value to be exported. Any names in the global scope are exported:

```hs
-- numbers.odd
a = 1;
b = 3;
```

```hs
-- main.odd
numbers = import ''numbers''; -- { a = 1, b = 3 }
numbers ''a'' + numbers ''b'' -- 4
```

To import only specific names from a module, you can destructure them:

```hs
-- module.odd
a = 1;
b = 2;
c = 3;

-- main.odd
{ a, c } = import ''module'';
a -- 1
b -- Error: "b" is not defined
c -- 3
```

<br/>
<br/>

## Functions

A function is written like any other value declaration:

```hs
add a b = a + b;
```

The syntactical difference between a normal value and a function is that a function has multiple patterns on the left side of the equals sign. The first symbol is the name of the function, followed by one or more patterns that are treated as parameters.

This syntax is sugar for assigning a lambda to the leftmost symbol, meaning it is curried by default:

```hs
a b c d = 3;
-- is equal to
a = b c d -> 3;
-- which in turn is equal to
a = b -> c -> d -> 3;
```

<br/>
<br/>

## Types

> ℹ️ Types are a planned feature. Odd will feature a strict HM type system. Any value will be soundly typed, but type syntax should stay out of the programmer's way.

<br/>
<br/>

# 🤸 Contribute

Conceptualised and authored by ([@maanlamp](https://github.com/maanlamp)). Feel free to contribute: [create an issue](https://github.com/oddlanguage/odd/issues/new) or [a pull request](https://github.com/oddlanguage/odd/pulls).
