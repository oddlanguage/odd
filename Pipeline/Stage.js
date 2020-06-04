"use strict";

import { performance } from "perf_hooks";
import { write, overwrite, capitalise, formatTime } from "../util.js";

// TODO: Seems either my terminal or this script is screwing up the
// 	display of these clocks, can't figure out how to fix it. Unicode is hell.
// 	Uncomment ticker when the world finally catches up.

// const showTicker = (interval = 16) => {
// 	const clocks = ["🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘","🕙","🕚","🕛"];
// 	let i = 0;
// 	return setInterval(
// 		write.bind(null, clocks[i++ % clocks.length] + " "),
// 		interval);
// };

export default class Stage {

	constructor (name, handler) {
		this.name = capitalise(name);
		this.handler = async (...args) => {
			overwrite(`⏳ ${this.name}... `);
			// const ticker = showTicker(16);
			const before = performance.now();
			let value;
			try {
				value = await handler(...args);
			} catch (error) {
				// clearInterval(ticker);
				throw error;
			}
			const after =	performance.now();
			// clearInterval(ticker);
			overwrite(`✔️ ${this.name} DONE (${formatTime(after - before)})\n`);
			return value;
		};
	}

};