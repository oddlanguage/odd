module.exports = class Parser {
	constructor () {
		this.plugins = [];
	}

	use (plugin) {
		this.plugins.push(plugin);
		return this;
	}

	parse (tokens) {
		//Return AST
		return Promise.resolve({});
	}
}