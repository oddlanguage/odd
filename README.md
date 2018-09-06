<img src="./logo.png" style="display: block; width: 50vw; margin: 10rem 0 3rem 0;" />
This repo contains a Javascript-based lexer and transcompiler for a language I made myself, called "odd".

## Syntax
Odd syntax should be familiar yet _odd_ :) for many programmers. It borrows a lot of its syntax from JavaScript, and is also inspired in part by Lua. Note that this is a personal project for learning purposes (and possibly personal use). Which sane person wants to transcompile into lua, anyway? :p

## Lexer
The lexer goes through any odd script and saves all scopes, expressions and tokens with their respective type in a JSON format. e.g.:
```json
{
  "expressions": [
    {
      "raw": "const int: myAge = 19",
      "tokens": [
        {
          "value": "const",
          "type": "DECLARATION_CONSTANT"
        },
        {
          "value": "int:",
          "type": "DECLARATION_TYPE_INTEGER"
        },
        {
          "value": "myAge",
          "type": "IDENTIFIER"
        },
        {
          "value": "=",
          "type": "OPERATOR_ASSIGNMENT_EQL"
        },
        {
          "value": "19",
          "type": "LITERAL_NUMBER"
        }
      ]
    }
  ]
}
```

## Transcompiling
Currently the transcompiler supports no code output (because it does not actually exist). Planned output languages are:
- JavaScript (es6+)
- Lua 5.3+