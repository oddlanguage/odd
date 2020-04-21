"use strict";

export const unique = iterable =>
	[...new Set(iterable)];

export function* range (n) {
	let i = 0;
	const m = Math.abs(n);
	while (i < m)
		yield i++;
}

export const print = (...values) => {
	const location = new Error().stack
		.split("\n")[2]
		.split(/\/|\\/)
		.slice(-3)
		.join("/")
		.slice(0, -1);
	console.log(`\nprint @ ${location}`);
	for (const message of values)
		console.log(message);
	console.log(); // one more enter
};

export const escapeString = string =>
	JSON.stringify(string).slice(1, -1);

export const formatTime = ms => {
	const [value, unit] = (()=>{
		if (ms < 0.01)
			return [ms * 100000, "ns"];
		else if (ms < 1)
			return [ms * 1000, "μs"];
		else if (ms > 1000)
			return [ms / 1000, "s"];
		return [ms, "ms"];
	})();
	return `${value.toFixed(2)} ${unit}`;
}

export const isFalsy = value => !value;

export const countSuffix = (word, count) =>
	(count === 1)
		? word
		: word + "s";

export const grab = (array, predicate) =>
	array.splice(array.findIndex(predicate), 1);

export const capitalise = input =>
	input[0].toUpperCase() + input.slice(1);

export const write = input => {
	process.stdout.cursorTo(0);
	process.stdout.write(input);
};

export const overwrite = input => {
	process.stdout.clearLine();
	write(input);
};

export const wait = ms =>
	new Promise(res => setTimeout(res, ms));

export const enumerable = target => {
	const obj = {};
	for (const [key, value] of Object.entries(target))
		Object.defineProperty(obj, key, { value });
	return Object.freeze(obj);
};

export const partition = (target, predicate) =>
	target.reduce((partitions, value) =>
		(partitions[Number(!predicate(value))].push(value), partitions),
		[[], []]);