"use strict";

const LexicalToken = require("../../../Lexer-generator/LexicalToken.js");
const IndentStack = require("./IndentStack.js");

module.exports = function blocker (tokens) {
	const newtokens = [];
	const indentstack = new IndentStack();
	let indentType;
	let i = 0;

	const skip = () => i++;
	const consume = token => {if (!/^\s+$/.test(token.lexeme)) newtokens.push(token);};
	const lookbehind = () => tokens[i-1];

	const preventWhitespaceMixing = token => {
		console.log("here0");
		if (!indentType)
			return indentType = token.type;

		console.log("here1");
		if (token.type != indentType)
			throw `Don't use ${token.type}s if you use ${indentType}s.`;
	}

	const recognise = token => {
		if (lookbehind().lexeme !== "->")
			return;

		skip();
		preventWhitespaceMixing(token);

		const indent = token.lexeme.length;
		if (indent === indentstack.last())
			skip();

		if (indent > indentstack.last()) {
			indentstack.push(indent);
			consume(new LexicalToken("indent"));
		}

		if (indent < indentstack.last()) {
			if (!indentstack.includes(indent))
				throw `Inconsistent indentation.`;
			indentstack.popTill(
				() => indent >= indentstack.last(),
				() => consume(new LexicalToken("dedent")));
		}
	};

	while (i++ < tokens.length - 1) {
		console.log("here2");
		if (tokens[i].type !== "newline")
			consume(tokens[i]);
		else
			recognise(tokens[i]);
	}

	return newtokens;
};