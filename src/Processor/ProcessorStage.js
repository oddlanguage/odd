module.exports = class ProcessorStage {
	constructor (name, handler, plugins = []) {
		Object.assign(this, {name, handler, plugins});
	}

	async handle (input) {
		try {
			console.log(`Calling handler: ${this.handler.name}`);
			let value = await this.handler(input);
			for (const plugin of this.plugins) {
				console.log(`Calling plugin: ${plugin.name}`);
				value = await plugin(value);
			}
			return value;
		} catch (error) {
			throw `${this.name.capitalise()}Error: ${error.message || error}`;
		}
	}
}