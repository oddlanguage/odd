//THIS DOES NOT PROPERLY EXTRACT ERRORS FROM PROMISE REJECTIONS

module.exports = function error (message) {
	console.error(message);
	process.exit(1);
	
	if (message.toString)
		message = message.toString();

	const cleanStack = (new Error()).stack
		.split(/\n/)[3]
		.replace(/\\/g, "/")
		.match(/\((.+)\)$/)[1];
	const [file, line, column] = cleanStack
		.substring(cleanStack.lastIndexOf("/") + 1)
		.split(":");
	const trimmedMessage = message.trim();
	const firstIndentLevel = ((trimmedMessage
		.split("\n")
		.find(line => line.trimLeft() !== line)) || "")
		.match(/^\s*/)[0].length;
	const leadingWhitespace = new RegExp(`^\\s{${firstIndentLevel}}`, "gm");
	const formattedMessage = trimmedMessage
		.replace(leadingWhitespace, "")
		.replace(/\t/g, " ".repeat(4));

	console.error(`\nError in ${file} at line ${line}, column ${column}.\n${formattedMessage}\n`);
	process.exit(1);
}