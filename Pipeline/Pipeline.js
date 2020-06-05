"use strict";

import { write, overwrite, formatTime, sum, capitalise } from "../util.js";
import { performance } from "perf_hooks";

// BUG: Clocks are displayed as ??.
// 	Pretty sure that microsoft terminal doesn't
// 	properly display the clocks, but maybe
// 	I'm screwing up here?

const showTicker = (interval = 16) => {
	const clocks = ["🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘","🕙","🕚","🕛"];
	let i = 0;
	return setInterval(
		write.bind(null, clocks[i++ % clocks.length] + " "),
		interval);
};

export default class Pipeline {

	#stages = new Map();

	stage (name, handler) {
		if (this.#stages.has(name))
			throw new Error(`Cannot save rule "${name}" multiple times.`);

		this.#stages.set(name, handler);
		return this;
	}

	// TODO: Maybe hijack the stdout so that
	// 	stages can properly log stuff without
	// 	screwing up the rest of the stages' output?
	async process (input) {
		const times = new Map();
		const ticker = showTicker(100);

		try {
			for (const [name, handler] of this.#stages) {
				const capitalised = capitalise(name);
				overwrite(`🕛 ${capitalised}... `);
				const before = performance.now();
				input = await handler(input);
				const elapsed = performance.now() - before;
				times.set(name, elapsed);
				overwrite(`✔️ ${capitalised} DONE (${formatTime(elapsed)})\n`);
			}
			console.log(`🏁 Pipeline processed in ${formatTime(sum([...times.values()]))}.`);
			return input;
		} catch (message) {
			// TODO: Message should be an error object, not a string
			overwrite(`❌ ${message.toString()}\n`);
		} finally {
			clearInterval(ticker);
		}
	}

};