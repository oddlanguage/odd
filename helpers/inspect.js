const { inspect: _inspect } = require("util");

module.exports = function inspect (...values) {
	const errLine = new Error().stack
		.split(/\n\s*/)[2];
	const pos = errLine.slice(errLine.lastIndexOf("\\") + 1, -1);
	console.log(`\n\n@ ${pos}`);
	values.forEach(value => {
		console.log(_inspect(value, {
			depth: Infinity,
			colors: true,
			compact: false
		}));
	});
	console.log("\n");
}