"use strict";

import Stage from "./Stage.js";
import StageError from "./StageError.js";

export default class Pipeline {

	constructor () {
		this._stages = new Map();
	}

	stage (name, handler) {
		this._stages.set(name, new Stage(name, handler));
		return this;
	}

	async process (input) {
		let _name;
		try {
			for (const [name, stage] of this._stages) {
				_name = name;
				input = await stage.handler(input);
			}
			return input;
		} catch (message) {
			throw new StageError(_name, message);
		}
	}

};