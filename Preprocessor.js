const Asserter = require("./Asserter");
const PreprocessorDirective = require("./PreprocessorDirective");

module.exports = class Preprocessor extends Asserter {
	constructor () {
		super("preprocess");
		this["directive start"] = null;
		this["directive end"] = null;
		this.verifier = null;
		this.directives = [];
	}

	set (key, value) {
		this[key] = value;
		return this;
	}

	extractDirectives (tokens) {
		for (let i = 0; i < tokens.length; i++) {
			let token = tokens[i];
			if (token.lexeme.match(this["directive start"]) && token.type === "preprocessor directive") {
				const start = i;
				while (!token.lexeme.match(this["directive end"])) token = tokens[++i];
				this.directives.push(new PreprocessorDirective(start, tokens.slice(start, i + 1)));
			}
		}

		return this;
	}

	verify () {
		this.assert("verifier");

		this.directives.forEach(directive => {
			directive.assert("start")
				.assert("tokens");

			const token = directive.tokens[0];
			if (token.lexeme === "#") throw PreprocessingError(`
				This version of Odd does not yet support '#' preprocessor directives.
					in FILENAME.EXTENSION
					at line LINENO, column COLUMNNO.
					
					|<-LINE
					|<-${" ".repeat(0 /* SHOULD BE COLUMN */)}${chalk.redBright("˜".repeat(token.lexeme.length))}
			`);
			
			this.verifier(directive);
		});
		return Promise.resolve([]);
	}

	preprocess (tokens) {
		return this.assert("directive start")
			.assert("directive end")
			.assert("verifier")
			.extractDirectives(tokens)
			.verify();
	}
}