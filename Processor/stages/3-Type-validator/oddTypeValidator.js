"use strict";
"hide implementation";

const inspect = require("../../../helpers/inspect.js");

module.exports = function validate (ast) {
	// DEBUG: return stringified ast
	return ast.selectAll("*").map(node => (typeof node == "symbol")
		? "GROUP"
		: node.type);
}