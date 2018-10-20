const chalk = require("chalk");

function clamp (string, length = 2, padding = "0") {
	string = String(string);
	const offset = length - string.length;
	if (string.length < length) return padding.repeat(offset) + string;
	if (string.length > length) return string.slice(-length);
	return string;
}

module.exports = function timestamp () {
	const date = new Date();
	return chalk.hex("#A6E22E").italic(`${clamp(date.getHours())}:${clamp(date.getMinutes())}:${clamp(date.getSeconds())}.${date.getMilliseconds()}`);
}