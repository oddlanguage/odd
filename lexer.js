const path = require("path");

const WHITESPACE      = /\s/;
const NUMBERSTART     = /[.#\d]/;
const NUMBER          = /[\da-f.e]/i;
const IDENTIFIERSTART = /[a-z_]/i;
const IDENTIFIER      = /[\w$]/i;
const OPERATOR        = /[.=+\-/*%^~<>?:&|]/;
const TYPEEND         = /[:\[\]}{]/;

class LexicalToken {
	constructor (type, lexeme) {
		this.type = type;
		this.lexeme = lexeme;
	}
}

function getLine (source, lineNumber) {
	const lineStart = source.split("\n", lineNumber - 1).join("\n").length;
	const lineEnd = source.split("\n", lineNumber).join("\n").length;
	return source.slice(lineStart, lineEnd).replace(/[\t\r\v]/g, "");
}

exports.lexer = function lexer (input, sourcePath) {
	let cursor = 0;
	const tokens = [];
	
	while (cursor < input.length) {
		let character = input[cursor];

		if (character === ";") {
			tokens.push(new LexicalToken("semicolon", character));
			cursor++;
			continue;
		}
		if (character === ",") {
			tokens.push(new LexicalToken("comma", character));
			cursor++;
			continue;
		}
		if (character === "(") {
			tokens.push(new LexicalToken("opening parenthesis", character));
			cursor++;
			continue;
		};
		if (character === ")") {
			tokens.push(new LexicalToken("closing parenthesis", character));
			cursor++;
			continue;
		};
		if (character === "{") {
			tokens.push(new LexicalToken("opening accolade", character));
			cursor++;
			continue;
		};
		if (character === "}") {
			tokens.push(new LexicalToken("closing accolade", character));
			cursor++;
			continue;
		};
		if (character === "[") {
			tokens.push(new LexicalToken("opening bracket", character));
			cursor++;
			continue;
		};
		if (character === "]") {
			tokens.push(new LexicalToken("closing bracket", character));
			cursor++;
			continue;
		};
		if (WHITESPACE.test(character)) {
			cursor++;
			continue;
		}
		if (NUMBERSTART.test(character)) {
			let lexeme = character;
			character = input[++cursor];
			while (NUMBER.test(character)) {
				lexeme += character;
				character = input[++cursor];
			}
			tokens.push(new LexicalToken("number", lexeme));
			continue;
		}
		if (character === '"') {
			let lexeme = character; //Set string to first quote
			character = input[++cursor];
			while (character !== '"') {
				lexeme += character;
				character = input[++cursor];
			}
			character = input[cursor++]; //Skip cursor to next position
			lexeme += character; //Add last quote
			tokens.push(new LexicalToken("string", lexeme));
			continue;
		}
		if (character === "`") {
			let lexeme = character; //Set string to first quote
			character = input[++cursor];
			while (character !== "`") {
				lexeme += character;
				character = input[++cursor];
			}
			character = input[cursor++]; //Skip cursor to next position
			lexeme += character; //Add last quote
			tokens.push(new LexicalToken("template literal", lexeme));
			continue;
		}
		//Names and types
		if (IDENTIFIERSTART.test(character)) {
			let lexeme = "";
			while (IDENTIFIER.test(character)) {
				lexeme += character;
				character = input[++cursor];
			}
			//After getting the entire name, check if it's followed by type-ending characters
			//for convenience, just copy the current character, lexeme and cursor to easily skip if it turns out not to be a type
			if (TYPEEND.test(character)) {
				let lexemeCopy = lexeme;
				let cursorCopy = cursor;
				let characterCopy = character;
				while (TYPEEND.test(characterCopy)) {
					lexemeCopy += characterCopy;
					characterCopy = input[++cursorCopy];
				}
				//Only if the last character of this lexeme is :, push it as a type token
				//(this prevents test[0] from being pushed as a type)
				//Update the character and cursor to the copy.
				if (lexemeCopy.slice(-1) === ":") {
					character = characterCopy;
					cursor = cursorCopy;
					tokens.push(new LexicalToken("type", lexemeCopy));
					continue;
				}
			}
			tokens.push(new LexicalToken("identifier", lexeme));
			continue;
		}
		if (OPERATOR.test(character)) {
			let lexeme = "";
			while (OPERATOR.test(character)) {
				lexeme += character;
				character = input[++cursor];
			}
			tokens.push(new LexicalToken("operator", lexeme));
			continue;
		}

		//Lexical error: no type recognised
		let errorLexeme = "";
		const start = cursor;
		while (!WHITESPACE.test(character)) {
			errorLexeme += character;
			character = input[++cursor];
		}
		const end = cursor;
		const line = (input.slice(0, end).match(/\n/g) || []).length + 1;
		const err = `LexicalError: Cannot identify token "${errorLexeme}"
		  in ${path.basename(sourcePath)} (line ${line}, char ${start}-${end})
		  ${getLine(input, line)}
		  ${" ".repeat(getLine(input, line).indexOf(errorLexeme) - (line > 1))}${"^".repeat(errorLexeme.length)}`.replace(/\t/g, "");
		throw err;
	}

	return tokens;
}