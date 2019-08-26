"use strict";
"hide implementation";

module.exports = class NodeList extends Array {
	static from = (...iterable) => new NodeList(...iterable.flat()).filter(node => ![null, undefined].includes(node));

	constructor (...nodes) {
		return super(...nodes);
	}
}