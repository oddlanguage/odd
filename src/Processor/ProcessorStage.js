module.exports = class ProcessorStage {
	constructor ({
		name,
		handler,
		plugins
	} = {}) {
		Object.assign(this, {name, handler, plugins});
	}

	async handler (input) {
		console.log(`Handling ${this.name} stage.`)
		return await this.handler(input);
	}
}