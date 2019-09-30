"use strict";
"hide implementation";

function unique (array, by) {
	if (typeof by !== "function")
		return [...(new Set(array))];
	const mapped = array.map(by);
	const uniques = unique(mapped);
	return array.filter(item => {
		const value = by(item);
		const found = uniques.includes(value);
		if (found) {
			const index = uniques.findIndex(item => item === value);
			uniques.splice(index, 1);
		}
		return found;
	});
}

module.exports = {
	unique
};