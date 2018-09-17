//Check through all definitions for type mismatching (throw preprocessingError)
//Find & replace all tokens that are defined
//Find definition errors

//This script only controls lexical preprocessing (definitions / simple substitution).
//Preprocessor directives get compiled before parsing but after sintax analysis (syntactic preprocessing).

//Iterator example found at https://medium.com/@chanakyabhardwaj/es6-reverse-iterable-for-an-array-5dae91c02904
//Iterator iterates reversed in order to splice

class Definition {
	constructor () {
		this._buffer = [];
	}

	broaden (token) {
		this._buffer.push(token);
	}

	getType () {
		let type = null;
		if (this._buffer[1].lexeme.slice(-1) === ":") type = this._buffer[1];
		return type;
	}

	getPattern () {
		const start = (this.type) ? 2 : 1;
		const end = this._indexes["="];
		let pattern = this._buffer.slice(start, end);
		return pattern.length ? pattern : null;
	}

	getReplacement () {
		const start = this._indexes["="] + 1;
		const end = this._indexes[";"];
		let replacement = this._buffer.slice(start, end);
		return replacement;
	}

	finalise () {
		this._indexes = {
			"=": this._buffer.findIndex(token => token.lexeme === "="),
			";": this._buffer.findIndex(token => token.lexeme === ";")
		};
		this.keyword = this._buffer[0];
		this.type = this.getType();
		this.pattern = this.getPattern();
		this.replacement = this.getReplacement();
		delete this._buffer;
		delete this._indexes;
		return this;
	}
}

module.exports = function preprocess (tokens, options) {
	let i = tokens.length;
	const reverseIterator = {
		next () {i -= 1; return {done: i < 0, value: tokens[i]}}
	};
	Object.defineProperty(tokens, Symbol.iterator, { //object.define in order to make the iterator not iterable
		value () {return reverseIterator}
	});

	const definitions = [];
	for (const token of tokens) {
		if (token.lexeme !== "define") continue;
		const definition = new Definition();
		while (i < tokens.length && (tokens[i]).type !== "semicolon") {
			definition.broaden(tokens.splice(i, 1)[0]);
		}
		definition.broaden(tokens.splice(i, 1)[0]); //Eat the following semicolon too
		definitions.push(definition.finalise());
	}

	if (options.verbose) console.log(`Handled ${definitions.length} definition${definitions.length === 1 ?"":"s"}.`);
	
	return tokens;
}