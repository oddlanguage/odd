"use strict";
"hide implementation";

const noop = Function.prototype;

function curry (fn, ...args) {
	return () => fn(...args);
}

module.exports = {
	noop,
	curry
}