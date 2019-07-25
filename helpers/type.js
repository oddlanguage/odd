function getConstructor (value) {
	return value.constructor || {name: "null"};
}

module.exports = function type (value) {
	if (value === undefined) return "undefined";
	return getConstructor(value).name.toLowerCase();
}