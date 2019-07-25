"use strict";
"hide implementation";

module.exports = function preprocessor (tokens) {
	// for (const token of tokens) console.log(token);
	return tokens;

	return (function* () {
		for (const token of tokens)
			yield token;
	})();
}