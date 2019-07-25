function capitalise (string) {
	return string.replace(/(\b[a-z])/gi, char => char.toUpperCase());
}

function inflect (thing, count) {
	return (count === 1)
		? thing
		: `${thing}s`;
}

module.exports = {
	capitalise,
	inflect
}