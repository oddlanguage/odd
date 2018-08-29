const Cursor = require("./Classes/Cursor");
const LexicalToken = require("./Classes/LexicalToken");
const Character = require("./Classes/Character");
const LexicalError = require("./Classes/Errors/LexicalError");

function normalisePath (path) {
	return path.replace(/\\+/g, "/");
}

/*
	ToDo:
		Add types property to LexicalToken (obj of types, basetype & rest)
		misschien manier voor een switch statement?
		Add types
		Add RegExp
		Preprocessing (preprocessor statements, define)
		Log how much time lexing cost.
		add eatWhile() function
		overal waar "character.position < input.length" staat in while loops, error expecting ...
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
	["COMMENTSTART"   , "/"],
	["DIRECTIVE"      , "#"]
]);

module.exports = function tokenise (input, options) {
	//Clean the input
	input = input.replace(/[\f\v]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"); //Fix this horrid line

	function log (message) {
		if (!options.verbose) return;
		console.log(message);
	}

	//Warn the user if options object is not correctly defined/filled.
	if (options) {
		if (options.verbose) {
			log("Verbose logging is enabled.");
		}
		if (!options.sourcepath) {
			log("No sourcepath provided, error logging may be insufficient.");
		}
		if (!options.extensive) {
			log("Extensive error logging is disabled, no positional information will be provided.");
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
	const character = new Character(input, cursor);
	const tokens = [];

	function eat () {
		const temp = character.value;
		cursor.step();
		return temp;
	}

	while (character.position < input.length) {
		//Skip whitespace
		if (character.is(patterns.get("WHITESPACE"))) {
			cursor.step();
			continue;
		}

		//Comments
		if (character.is(patterns.get("COMMENTSTART"))) {
			if (character.next().is(patterns.get("COMMENTSTART"))) {
				let lexeme = eat();
				while (!character.is(patterns.get("LINEBREAK"))) {
					lexeme += eat();
				}
				tokens.push(new LexicalToken("comment", lexeme));
				continue;
			}
		}

		//Semicolons
		if (character.is(patterns.get("STATEMENTEND"))) {
			tokens.push(new LexicalToken("semicolon", eat()));
			continue;
		}

		//Strings
		if (character.is(patterns.get("STRING"))) {
			let lexeme = eat(); //Eat the opening character
			while (!character.is(patterns.get("STRING"))) {
				lexeme += eat();
			}
			lexeme += eat(); //Eat the closing character
			tokens.push(new LexicalToken("string", lexeme));
			continue;
		}

		//Template literals
		if (character.is(patterns.get("TEMPLATELITERAL"))) {
			let lexeme = eat(); //Eat the opening character
			while (character.position < input.length && !character.is(patterns.get("TEMPLATELITERAL"))) {
				lexeme += eat();
			}
			lexeme += eat(); //Eat the closing character
			tokens.push(new LexicalToken("templateLiteral", lexeme));
			continue;
		}

		//Numbers
		if (character.is(patterns.get("NUMBERSTART"))) {
			cursor.save();
			let lexeme = eat();
			while (character.is(patterns.get("NUMBER"))) {
				lexeme += eat();
			}
			//Make sure only actual numbers get tagged as such, not just a period.
			if (!character.previous().is(".")) {
				tokens.push(new LexicalToken("number", lexeme));
				continue;
			}
			cursor.restore();
		}

		//Operators
		if (character.is(patterns.get("OPERATOR"))) {
			let lexeme = eat();
			while (character.is(patterns.get("OPERATOR"))) {
				lexeme += eat();
			}
			tokens.push(new LexicalToken("operator", lexeme));
			continue;
		}

		//Types
		if (character.is(patterns.get("TYPE"), patterns.get("NAMESTART"))) {
			cursor.save();
			let lexeme = eat();
			while (character.position < input.length && !character.is(patterns.get("WHITESPACE"))) {
				lexeme += eat();
			}
			if (character.previous().is(patterns.get("TYPEEND"))) {
				if (!options.ignoreTypes) tokens.push(new LexicalToken("type", lexeme));
				continue;
			}
			cursor.restore();
		}

		//Names
		if (character.is(patterns.get("NAMESTART"))) {
			let lexeme = eat();
			while (character.is(patterns.get("NAME"))) {
				lexeme += eat();
			}
			tokens.push(new LexicalToken("name", lexeme));
			continue;
		}

		//Separators
		if (character.is(patterns.get("SEPARATOR"))) {
			tokens.push(new LexicalToken("separator", eat()));
			continue;
		}

		//Preprocessor directives
		if (character.is(patterns.get("DIRECTIVE"))) {
			let lexeme = eat();
			while (character.position < input.length && !character.is(patterns.get("STATEMENTEND"))) {
				lexeme += eat();
			}
			tokens.push(new LexicalToken("preprocessorDirective", lexeme));
			continue;
		}

		//No lexeme recognised
		const { line, lineNumber, column } = character.getErrorInfo();
		let lexeme = eat();
		while (character.position < input.length && !character.is(patterns.get("WHITESPACE")) && character.is(patterns)) {
			lexeme += eat();
		}
		throw new LexicalError(`Unrecognised lexeme "${lexeme}"\n  in ${normalisePath(options.sourcepath)}\n  at line ${lineNumber}, column ${column}.\n\n${line}\n${" ".repeat(column)}${"^".repeat(lexeme.length)}`);
	}

	return tokens;
}