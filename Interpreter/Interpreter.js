export default class Interpreter {

	#rules = new Map();

	rule(name, handler) {
		this.#rules.set(name, handler);
		return this;
	}

	interpret(ast) {
		const handler = this.#rules.get(ast.type);

		if (!handler)
			throw `No rule defined for nodes of type "${ast.type}".`;

		return handler(ast);
	}

}