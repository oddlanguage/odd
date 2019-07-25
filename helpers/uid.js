module.exports = function uid () {
	return "x"
		.repeat(16)
		.replace(/x/g, () => (Math.random() * 16 | 0)
			.toString(16))
}