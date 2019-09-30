"use strict";
"hide implementation";

//THIS DOES NOT PROPERLY EXTRACT ERRORS FROM PROMISE REJECTIONS

module.exports = function error (message) {
	if (message.toString)
		message = message.toString();

	const errorLocation = new Error().stack
		.split(/\n/)[3]
		.replace(/\\/g, "/")
		.match(/\((.+)\)$/)[1];
	const [file, line, column] = errorLocation
		.substring(errorLocation.lastIndexOf("/") + 1)
		.split(":");
	const trimmedMessage = message.trim();
	const firstIndentLevel = ((trimmedMessage
			.split("\n")
			.find(line => line.trimLeft() !== line))
		|| "")
		.match(/^\s*/)[0].length;
	const leadingWhitespace = new RegExp(`^\\s{${firstIndentLevel}}`, "gm");
	const formattedMessage = trimmedMessage
		.replace(leadingWhitespace, "")
		.replace(/\t/g, " ".repeat(2));

	console.error(`\nError in ${file} at line ${line}, column ${column}.\n${formattedMessage}\n`);
	process.exit(1);
}