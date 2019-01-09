module.exports = class ProcessorStage {
	constructor (name, handler, plugins = []) {
		Object.assign(this, {name, handler, plugins});
	}

	handle (input) {
		try {
			let value = this.handler(input);
			for (const plugin of this.plugins) value = plugin(value);
			return value;
		} catch (error) {
			throw `${this.name.capitalise()}Error: ${error.message || error}`;
		}
	}
}