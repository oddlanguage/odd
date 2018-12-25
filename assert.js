module.exports = function assert (condition, message, level) {
	if (typeof condition !== "boolean") throw new Error("Condition must be, or resolve into, a boolean value.");
	const msg = message || "Assertion failed. Provide a message to identify the problem with your assertion.";
	if (condition === false) switch (level) {
		case 0: case "ignore":         return;
		case 1: case "warn":           return console.warn(msg);
		case 2: case "error": default: throw new Error(msg);
	}
}