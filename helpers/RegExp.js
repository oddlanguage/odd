const type = require("./type.js");
const assert = require("./assert.js");

function getPattern (regexp) {
	assert(type(regexp) === "string" || type(regexp) === "regexp")
		.error(`Argument must be a string or a RegExp.`);

	const string = regexp.toString();
	return string.slice(1, string.lastIndexOf("/"));
}

module.exports = {
	getPattern
};