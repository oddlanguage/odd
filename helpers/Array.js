function unique (array) {
	return [...(new Set(array))];
}

module.exports = {
	unique
};