module.exports = class Preprocessor {
	constructor () {
		this["directive start"] = null;
		this["directive end"] = null;
	}

	set (key, value) {
		this[key] = value;
		return this;
	}

	preprocess (tokens) {
		this.assert("directive start");
		this.assert("directive end");

		const directives = [];

		for (let i = 0; i < tokens.length; i++) {
			let token = tokens[i];
			if (token.lexeme.match(this["directive start"]) && token.type === "preprocessor directive") {
				const start = i;
				while (!token.lexeme.match(this["directive end"])) token = tokens[++i];
				directives.push(tokens.slice(start, i + 1));
			}
		}

		console.log(directives.map(directive => directive.map(item => item.lexeme).join("")).join("\n-----------\n"));

		return Promise.resolve(tokens);
	}

	assert (property, severity = "error") {
		//Assert that this[property] exists, and it is a usable value.
		//If not, ignore, warn or error depending on severity of property's absence.
		if (this.hasOwnProperty(property) && this[property] !== null) return this;
		switch (severity) {
			case 0: case "ignore": {
				return this;
			}
			case 1: case "warn": {
				console.log(`Expected '${property}', trying to lex without...`);
				return this;
			}
			case 2: case "error": {
				throw new Error(`Cannot preprocess without a ${property}.`);
			}
		}
	}
}