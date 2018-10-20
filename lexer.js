const Cursor = require("./Classes/Cursor");
const LexicalToken = require("./Classes/LexicalToken");
const Character = require("./Classes/Character");
const LexicalError = require("./Classes/Errors/LexicalError");
const chalk = require("chalk");

function normalisePath (path) {
	return path.replace(/\\+/g, "/");
}

function getErrorInfo (input, position) {
	let lineNumber = 1;
	let column = 0;

	for (let i = 0; i < position; i++) {
		if (input.charAt(i) === "\n") {
			lineNumber++;
			column = 0;
		} else {
			column++;
		}
	}

	const lines = input.split("\n");
	const line = lines[lineNumber - 1];

	return {line: line, lineNumber: lineNumber, column: column};
}

/*
ToDo:
Add types property to LexicalToken (obj of types: basetype & rest)
Misschien manier voor een switch statement?
Add RegExp or other pattern matching support
Preprocessing (preprocessor statements, define)
Add eatWhile() function?
Overal waar "character.position < input.length" staat in while loops, vervang naar if (i >= input.length) throw error expecting ...
Extract getErrorInfo()
*/

const patterns = new Map([
	["WHITESPACE"     , /\s/],
	["NAMESTART"      , /[a-z_$]/i],
	["NAME"           , /[\w$]/],
	["TYPE"           , /[\[\]}{]/],
	["TYPEEND"        , ":"],
	["OPERATOR"       , /[.=+\-/*%^~<>?&|!:]/],
	["NUMBERSTART"    , /[\d.]/],
	["NUMBER"         , /[\de.]/i],
	["STATEMENTEND"   , ";"],
	["LINEBREAK"      , "\n"],
	["SEPARATOR"      , /[\[\]{}\(\),]/],
	["STRING"         , '"'],
	["TEMPLATELITERAL", "`"],
	["SLASH"          , "/"],
	["DIRECTIVE"      , "#"]
]);
	
module.exports = function tokenise (input, options) {
	//Clean the input
	input = input.replace(/[\f\v]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"); //Fix this horrid line
	
	function log (message) {
		if (!options.verbose) return;
		console.log("  " + message);
	}
	
	//Warn the user if options object is not correctly defined/filled.
	if (options) {
		if (!options.extensive) {
			log("Extensive error logging is disabled, no positional info will be saved.");
		}
		if (!options.allowUnicode) {
			log("Unicode characters will not be allowed.");
		}
		if (options.ignoreTypes) {
			log("Types will be ignored.");
		}
		//Other options
		if (Object.keys(options).length === 0) {
			log("Options object has no keys, consider removing it.");
		}
	} else {
		console.log("No options object provided, error logging may be insufficient.");
	}
	
	const cursor = new Cursor();
	const character = new Character(input, cursor, patterns);
	const tokens = [];
	
	function eat () {
		const temp = character.value;
		cursor.step();
		return temp;
	}

	function getPosition (start) {
		if (options.extensive) return {
			start: start,
			end: cursor.position
		};
	}
	
	while (character.position < input.length) {
		//Skip whitespace
		if (character.is("WHITESPACE")) {
			cursor.step();
			continue;
		}
		
		//Comments
		if (character.is("SLASH")) {
			if (character.next().is("SLASH")) {
				const start = cursor.position;
				let lexeme = eat();
				while (!character.is("LINEBREAK")) {
					lexeme += eat();
				}
				tokens.push(new LexicalToken("comment", lexeme, getPosition(start)));
				continue;
			}
		}
		
		//Semicolons
		if (character.is("STATEMENTEND")) {
			tokens.push(new LexicalToken("semicolon", eat(), getPosition(cursor.position - 1)));
			continue;
		}
		
		//Strings
		if (character.is("STRING")) {
			const start = cursor.position;
			let lexeme = eat(); //Eat the opening character
			while (!character.is("STRING")) {
				lexeme += eat();
			}
			lexeme += eat(); //Eat the closing character
			tokens.push(new LexicalToken("string", lexeme, getPosition(start)));
			continue;
		}
		
		//Template literals
		if (character.is("TEMPLATELITERAL")) {
			const start = cursor.position;
			let lexeme = eat(); //Eat the opening character
			while (character.position < input.length && !character.is("TEMPLATELITERAL")) {
				lexeme += eat();
			}
			lexeme += eat(); //Eat the closing character
			tokens.push(new LexicalToken("templateLiteral", lexeme, getPosition(start)));
			continue;
		}
		
		//Numbers
		if (character.is("NUMBERSTART")) {
			const start = cursor.save();
			let lexeme = eat();
			while (character.is("NUMBER")) {
				lexeme += eat();
			}
			//Make sure only actual numbers get tagged as such, not just a period.
			if (!character.previous().is(".")) {
				tokens.push(new LexicalToken("number", lexeme, getPosition(start)));
				continue;
			}
			cursor.restore();
		}
		
		//Operators
		if (character.is("OPERATOR")) {
			const start = cursor.position;
			let lexeme = eat();
			while (character.is("OPERATOR")) {
				lexeme += eat();
			}
			tokens.push(new LexicalToken("operator", lexeme, getPosition(start)));
			continue;
		}
		
		//Types
		if (character.is("TYPE", "NAMESTART")) {
			const start = cursor.save();
			let lexeme = eat();
			while (character.position < input.length && !character.is("WHITESPACE")) {
				lexeme += eat();
			}
			if (character.previous().is("TYPEEND")) {
				if (!options.ignoreTypes) tokens.push(new LexicalToken("type", lexeme, getPosition(start)));
				continue;
			}
			cursor.restore();
		}
		
		//Names
		if (character.is("NAMESTART")) {
			const start = cursor.position;
			let lexeme = eat();
			while (character.is("NAME")) {
				lexeme += eat();
			}
			tokens.push(new LexicalToken("name", lexeme, getPosition(start)));
			continue;
		}
		
		//Separators
		if (character.is("SEPARATOR")) {
			tokens.push(new LexicalToken("separator", eat(), getPosition(cursor.position - 1)));
			continue;
		}
		
		//Preprocessor directives
		if (character.is("DIRECTIVE")) {
			const start = cursor.position;
			let lexeme = eat();
			while (character.position < input.length && !character.is("WHITESPACE")) {
				lexeme += eat();
			}
			tokens.push(new LexicalToken("preprocessorDirective", lexeme, getPosition(start)));
			continue;
		}
		
		//No lexeme recognised
		const { line, lineNumber, column } = getErrorInfo(input, cursor.position);
		let lexeme = eat();
		while (character.position < input.length && !character.is("WHITESPACE") && character.is(patterns)) {
			lexeme += eat();
		}
		throw new LexicalError(`Unrecognised lexeme "${lexeme}"\n  in TODO: PATH OF CURRENT FILE\n  at line ${lineNumber}, column ${column}.\n\n${line}\n${" ".repeat(column)}${chalk.red("^".repeat(lexeme.length))}`);
	}
	
	return tokens;
}