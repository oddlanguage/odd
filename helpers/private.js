"use strict";
"hide implementation";

module.exports = function covert (target, name, value) {
	return Object.defineProperty(target, name, {
		value,
		enumerable: false,
		configurable: true,
		writable: true
	});
}