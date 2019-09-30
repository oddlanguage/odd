"use strict";
"hide implementation";

module.exports = class ID {
	static db = [];

	static seq () {
		return String(ID.db.push(ID.db.length) - 1);
	}

	static uniq (n = 16) {
		return "x"
			.repeat(n)
			.replace(/x/g, () => (Math.random() * 16 | 0)
				.toString(16))
	}
}