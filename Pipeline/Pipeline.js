"use strict";

import Stage from "./Stage.js";
import StageError from "./StageError.js";

export default class Pipeline {

	#stages = new Map();

	stage (name, handler) {
		if (this.#stages.has(name))
			throw new Error(`Cannot save rule "${name}" multiple times.`);

		this.#stages.set(name, new Stage(name, handler));
		return this;
	}

	async process (input) {
		let name;
		try {
			for (const [stageName, stage] of this.#stages) {
				name = stageName;
				input = await stage.handler(input);
			}
			return input;
		} catch (message) {
			// TODO: you shouldn't really thow strings, so we shouldn't enforce it like this
			throw new StageError(name, message);
		}
	}

};