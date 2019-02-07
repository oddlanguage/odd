require("prototype-extensions/Array");
const ProcessorStage = require("./ProcessorStage");
const assert = require("../assert");

module.exports = class Processor {
	constructor () {
		this.stages = [];
	}

	set (key, value) {
		//Assert not locked

		this[key] = value;

		return this;
	}

	get (key) {
		return this[key];
	}

	stage (name, handler, plugins = []) {
		//Assert not locked
		//Assert stage conforms to expectations

		
		this.stages.push(new ProcessorStage({
			name,
			handler,
			plugins
		}));

		return this;
	}

	use (plugins) {
		//Assert not locked
		//Assert plugin conforms to expectations

		this.stages
			.last()
			.plugins
			.merge(plugins);

		return this;
	}

	async process (input) {
		return this
			.lock()
			.stages
			.reduce(
				async (stageOutput, stage) => stage
					.plugins
					.reduce(
						async (pluginOutput, plugin) => await plugin(await pluginOutput),
						Promise.resolve(await stage.handler(await stageOutput))),
				Promise.resolve(input));
	}

	lock () {
		const whitelist = ["get", "process"];

		//Remove all methods except whitelisted ones
		//Maybe find another way to only expose whitelisted methods

		return this;
	}
}