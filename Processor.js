require("prototype-extensions/Array");
const assert = require("./assert");

module.exports = class Processor {
	constructor () {
		this.stages = [];
	}

	stage (name, handler) {
		this.stages.push({ name, handler, plugins: [] })
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

	process () {
		//go through all stages, using their plugins
		return Promise.resolve(null);
	}
}