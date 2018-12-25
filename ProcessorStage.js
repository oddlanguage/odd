function isNewable (value) {
	return (typeof value === "function" && "constructor" in value);
}

module.exports = class ProcessorStage {
	constructor (name, handler, plugins = []) {
		Object.assign(this, {name, handler, plugins});
	}

	handle (input) {
		let value = this.handler(input);
		for (const plugin of this.plugins) value = plugin(value);
		return value;
	}
}