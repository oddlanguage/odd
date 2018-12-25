require("prototype-extensions/Array");
const ProcessorStage = require("./ProcessorStage");
const assert = require("./assert");

module.exports = class Processor {
	constructor () {
		this.stages = [];
	}

	stage (name, handler) {
		this.stages.push(new ProcessorStage(name, handler));
		return this;
	}

	use (...plugin) {
		assert(this.stages[0] !== undefined, "Do not register plugins before declaring a processor stage.");

		this.stages
			.last()
			.plugins
			.concat(plugin);
		return this;
	}

	process (input) {
		const indefiniteArticle = ((typeof input)[0].match(/[aeiou]/)) ? "an" : "a";
		assert(typeof input === "string", `Cannot process ${indefiniteArticle} '${typeof input}' value.`);
		assert(this.stages[0] !== undefined, "Cannot process without any defined stages.");

		for (const stage of this.stages) input = stage.handle(input);
		return Promise.resolve(input);
	}
}