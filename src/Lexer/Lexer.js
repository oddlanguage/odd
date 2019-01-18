const assert = require("../assert");
const LexicalToken = require("./LexicalToken");
require("prototype-extensions/String");
const chalk = require("chalk");

module.exports = class Lexer {
	constructor () {
		this.rules = new Map();
		this.limitlessQuantifiers = /[*+]|.\{\d,\}/;
	}

	rule (type, grammar) {
		assert(
			typeof grammar === "string"
			|| grammar instanceof RegExp
		).error(`Unsupported grammar [${grammar} ${(typeof grammar).capitalise()}]`);

		// UNCOMMENT THIS ON PRODUCTION
		// assert(
		// 	this.limitlessQuantifiers.test(grammar.toString()) === false
		// ).warn(`the grammar for '${type}' contains limitless quantifiers. This could cause false negative matching.`);

		if (typeof grammar === "string") grammar = new RegExp(grammar.replace(/[^\w\s]/, "\\$&"));

		this.rules.set(type, grammar);
		return this;
	}

	async lex (input) {
		assert([
			typeof input.pipe === "function",
			typeof input.on === "function",
			typeof input.end === "function"
		]).error("Input must be a readable steam.");
		//Maybe check if it is a string/pathlike?

		const tokens = [];
		let buffer = "";
		let cursorPosition = 0;

		function findLexeme (buffer, grammar) {
			const match = buffer.match(grammar);
			if (match === null) return undefined;
			const [lexeme] = match;
			const {index} = match;
			return (index === 0) ? lexeme : undefined;
		}

		function getErrorLineContents (buffer, index) {
			const start = buffer
				.lastIndexOf("\n", index)
				+ 1;

			const end = buffer
				.indexOf("\n", start);

			return buffer.slice(start, end).trim();
		};

		function getLineAndColumn (buffer, index, errorLineContent, errorLexeme) {
			const line = (buffer.slice(0, index).match(/\r?\n/g) || "").length + 1;
			const column = errorLineContent.indexOf(errorLexeme);

			return [line, column];
		}

		function extractTokens (buffer) {
			const tokens = [];
			let index = 0;
			let prevIndex = index;

			while (index < buffer.length) {
				prevIndex = index;

				for (const [type, grammar] of this.rules) {
					const lexeme = findLexeme(buffer.slice(index), grammar);
					if (lexeme === undefined) continue;
					tokens.push(new LexicalToken(type, lexeme, cursorPosition));
					index += lexeme.length;
					cursorPosition += lexeme.length;
					break;
				}

				if (index === prevIndex) {
					const allGrammars = new RegExp(Array.from(this.rules).map(([, grammar]) => grammar.source).join("|"), "g");
					const errorLexeme = buffer.slice(index).replace(allGrammars, "");
					const errorLineContent = getErrorLineContents(buffer, index);
					const [line, column] = getLineAndColumn(buffer, index, errorLineContent, errorLexeme);
					throw new Error(`
						Unrecognised lexeme '${errorLexeme}'
							at line ${line}, column ${column}

						${errorLineContent}
						${" ".repeat(column)}${chalk.redBright("˜".repeat(errorLexeme.length))}
					`.dedent().trim());
				}
			}

			return tokens;
		}
		
		function bytesIn (string) {
			return Buffer.byteLength(string);
		}

		input.on("data", chunk => {
			buffer += chunk;

			const tokensThisPass = extractTokens.call(this, buffer);
			tokens.concat(tokensThisPass);

			if (tokensThisPass.length === 0 && bytesIn(buffer) > 1024) throw new Error("Buffer size limit exceeded without recognising a lexeme.");
		});

		input.on("end", () => {
			if (buffer.length === 0) return tokens;

			const tokensThisPass = extractTokens.call(this, buffer);
			tokens.concat(tokensThisPass);

			if (tokensThisPass.length === 0) throw new Error(`Unrecognised lexeme: ${buffer}`);
			
			return tokens;
		});
	}

	lexSync (input) {
		assert(input !== null).error("Input must be defined in order to lex!");

		const tokens = [];
		let line = 1;
		let column = 0;
		let shouldContinue = false;
		let index = 0;

		function getLineAndColumn (input, index) {
			let i = 0;
			while (i++ < index) {
				if (input.charAt(i) === "\n") {
					line++;
					column = 0;
				} else {
					column++;
				}
			}
			return {line, column};
		}

		while (index < input.length) {
			for (const [type, grammar] of this.grammars) {
				const lexeme = Lexer.verifyGrammar(grammar, input, index);
				if (lexeme !== false) {
					tokens.push(new LexicalToken(type, lexeme, index, index + lexeme.length));
					index += lexeme.length;
					shouldContinue = true;
				}
			}

			if (shouldContinue) {
				shouldContinue = false;
				continue;
			} else {
				const {line, column} = getLineAndColumn(input, index);

				let lexeme = input.slice(index);

				for (const [, grammar] of this.grammars) {
					lexeme = lexeme.replace(new RegExp(grammar, "g"), "");
				}

				let errorLineString = input
					.slice(input
						.slice(0, index)
						.lastIndexOf("\n") + 1)
					.replace(/\n[\s\S]*/, "")
					.trim();

				assert(this["error lexer"] !== null).warn("Cannot colourise lexical error without an 'error lexer'.");
				if (this["error lexer"]) {
					assert(this["colouriser"] !== null).error("Cannot colourise lexical error without a 'colouriser'.");
					errorLineString = this.colouriser(
						this["error lexer"]
							.rule("error", lexeme)
							.lex(errorLineString)
					);
				}

				throw new LexicalError(`Unknown lexeme ${chalk`{italic \`${lexeme}\`}`}`,
					"FILENAME.EXT",
					{line: line, column: column},
					`|<-${errorLineString}\n|<-${" ".repeat(Math.max(1, column - 1))}${chalk.redBright("˜".repeat(lexeme.length))}`);
			}
		}

		return tokens;
	}
}