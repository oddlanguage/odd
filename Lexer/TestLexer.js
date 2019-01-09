const Lexer = require("./Lexer");
const lexer = new Lexer();
lexer
	.set("error lexer", lexer)
	.set("colouriser", require("./OddColouriseCommandLine"))
	.rule("whitespace", /\s+/)
	.rule("string", /(?<!\\)".*"/)
	.rule("template literal", /(?<!\\)`.*`/)
	.rule("single line comment", /\/\/[^\n]*/)
	.rule("multi line comment", /\/\*[^*]*?\*\//)
	.rule("expression terminator", ";")
	.rule("punctuation", /[,\[\]\(\)}{]/)
	.rule("type annotation", /[\[{]?\w+?[<\[{]?\S*[>\]}]?:/)
	.rule("operator", /[.=+\-/*%^~<>?&|!:]|\b(new|exists|instanceof|typeof)\b/)
	.rule("controller", /\b(return|emits?|if|when|while|then|or|and|else|continue|throw|using|repeat)\b/)
	.rule("preprocessor directive", /#|\bdefine\b/)
	.rule("storage type", /\b(const|local|type|function|class|interface)\b/)
	.rule("storage modifier", /\b(extends|overt)\b/)
	.rule("builtin", /\b(Function|Array|Object|String|Boolean|Number|Math|Error)\b/)
	.rule("number", /\b\d*\.?\d+(?:[Ee][+-]?\d+)?/)
	.rule("literal", /\b(true|false|nil|null|undefined)\b/)
	.rule("identifier", /[a-zA-Z_$][\w$]*/);

const tokens = lexer
	.set("input", "define str: a = some.very.intriquite.lexeme;")
	.lexSync();

tokens.forEach((token, i) => {
	switch (i) {
		case 1: case 3: case 5: case 7: {
			if (
				token.type === "whitespace"
				&& token.lexeme === " "
				) return;
		}
		case 4: case 8: case 10: case 12: case 14: {
			if (
				token.type === "identifier"
				) return;
		}
		case 0: {
			if (
				token.type === "preprocessor directive"
				&& token.lexeme === "define"
				) return;
		}
		case 2: {
			if (
				token.type === "type annotation"
				&& token.lexeme === "str:"
				) return;
		}
		case 6: {
			if (
				token.type === "operator"
				&& token.lexeme === "="
				) return;
		}
		case 9: case 11: case 13: {
			if (
				token.type === "operator"
				&& token.lexeme === "."
				) return;
		}
		case 15: {
			if (
				token.type === "expression terminator"
				&& token.lexeme === ";"
				) return;
		}
	}
	throw new Error(`Token no. ${i} is not supposed to be ${token.type}: ${token.lexeme}`);
});
console.log("Succesfully passed test!");