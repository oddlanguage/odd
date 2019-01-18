require("prototype-extensions/Array");
const ProcessorStage = require("./ProcessorStage");
const assert = require("../assert");

module.exports = class Processor {
	constructor () {
		this.stages = [];
	}

	stage (name, handler) {
		this.stages.push(new ProcessorStage(name, handler));
		return this;
	}

	use (...plugin) {
		assert(this.stages[0] !== undefined).error("Do not register plugins before declaring a processor stage.");

		this.stages
			.last()
			.plugins
			.concat(plugin);

		return this;
	}

	async process (input) {
		assert([
			typeof input.on === "function",
			typeof input.end === "function"
		]).error("Input must be a readable steam.");
		
		assert(this.stages[0] !== undefined).error("Cannot process without any defined stages.");

		for (const stage of this.stages) {
			console.log(`Handling ${stage.name} stage.`);
			input = await stage.handle(input);
		}
		return input;
	}
}