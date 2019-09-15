"use strict";
"hide implementation";

const uid = require("../helpers/uid.js");
const type = require("../helpers/type.js");
const error = require("../helpers/error.js");
const { inflect, capitalise } = require("../helpers/String.js");
const { performance } = require("perf_hooks");
const inspect = require("../helpers/inspect.js");

// TODO: create warn() function that optionally
//	console.warns and increments stage warning
//	count.
// TODO: Maybe step away from async-await
//	because of the horrible stack traces.
//	Maybe .reduce? Or just wait for the
//	proposal to hit node.

function replaceConsoleLine (message) {
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(message);
}

function createClockTicker () {
	const clocks = ["🕛", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚"];
	let i = 0;
	return setInterval(()=>{
		i += 1;
		if (i > clocks.length - 1)
			i = 0;
		process.stdout.cursorTo(0);
		process.stdout.write(" " + clocks[i]);
		process.stdout.cursorTo(0);
	}, 100);
}

module.exports = class Processor {
	constructor () {
		this._stages = new Map();
	}

	stage (name, handler) {
		name = capitalise(name);
		this._stages.set(name, {
			name,
			handler
		});

		return this;
	}

	async process () {
		const ticker = createClockTicker();
		let input = Promise.resolve();
		for (const [name, stage] of this._stages) {
			replaceConsoleLine(` 🕛  ${name}...`);
			const before = performance.now();
			try {
				input = await stage.handler(input);
				const elapsed = Math.round(performance.now() - before);
				replaceConsoleLine(` ✔️  ${name} OK! (took ~${elapsed}ms and produced 0 warnings)\n`);
			} catch (err) {
				const elapsed = Math.round(performance.now() - before);
				replaceConsoleLine(` ❌  ${name} FAILED! (took ~${elapsed}ms and produced 0 warnings)\n`);
				error(err);
			}
		}
		clearInterval(ticker);

		return input;
	}
}