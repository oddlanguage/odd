require("prototype-extensions/Array");
module.exports = function lexicalPreprocessor (tokens) {
	function isUnterminated (end) {
		return end === -1;
	}

	function isPlain (rawDefinition) {
		const ignorableTypes = [
			"comment",
			"whitespace"
		];
		const definition = rawDefinition.filter(token => !ignorableTypes.some(toIgnore => token.type.match(toIgnore)));
		console.log(definition);
		const isTyped = definition[1].type === "type declaration";
		const allowedReplacementTypes = [
			"string",
			"template literal",
			"punctuation",
			"operator",
			"builtin",
			"number",
			"literal",
			"identifier"
		];
		//check tokens[pos + isTyped] === ...
		return false;
	}

	function getDefinitions (tokens) {
		return tokens
			.reduceRight((definitions, token, start) => {
				if (token.type === "preprocessor directive" && token.lexeme === "define") {
					const endTokenPosition = tokens
						.slice(start)
						.findIndex(token => token.type === "semicolon" && token.lexeme === ";");
					if (isUnterminated(endTokenPosition)) throw new Error(`Unterminated definition at ${start}.`);
					const end = endTokenPosition + start + 1;
					const count = end - start;
					const definition = tokens.slice(start, end);
					if (isPlain(definition)) definitions.push(tokens.splice(start, count));
				}
				//For some reason yet unknown, line 28 of test.odd
				//	is a giant directive while it should be 1 line.

				return definitions;
			}, []);
	}

	const definitions = getDefinitions(tokens);

	console.log(definitions);
	return tokens;
}