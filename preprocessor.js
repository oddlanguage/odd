//Check through all definitions for type mismatching (throw preprocessingError)
//Find & replace all tokens that are defined
//Find definition errors

//This script only controls lexical preprocessing (definitions / simple substitution).
//Preprocessor directives get compiled before parsing but after sintax analysis (syntactic preprocessing).

//Iterator example found at https://medium.com/@chanakyabhardwaj/es6-reverse-iterable-for-an-array-5dae91c02904
//Iterator iterates reversed in order to splice

const PreprocessingError = require("./Classes/Errors/PreprocessingError");

function inflect (word, count) {
	return count !== 1 ? `${word}s` : word;
}

module.exports = function preprocess (tokens, options) {
	let i = tokens.length;
	const reverseIterator = {next () {i -= 1; return {done: i < 0, value: tokens[i]}}};
	Object.defineProperty(tokens, Symbol.iterator, {value () {return reverseIterator}}); //Disallow iterating over tokens reverseIterator property

	const definitions = [];
	for (const token of tokens) {
		if (token.lexeme !== "define") continue;
		//splice tokens
	}

	if (options.verbose) console.log(`  Handled ${definitions.length} ${inflect("definition", definitions.length)}.`);
	
	return tokens;
}