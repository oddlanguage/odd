"use strict";

const PARENT = Symbol("parent");

module.exports = function interpret (ast, parentscope, name) {
	const scope = new Map();
	if (parentscope) {
		scope.set(PARENT, parentscope);
		parentscope.set(name, scope);
	}

	const nodes = ast.flatten();
	let i;
	let value;
	for (i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		switch (node.type) {
			case "program": {
				scope.set("print", console.log);
				scope.set("str", class Type_str {});
				scope.set("int", class Type_int {});
				scope.set("boo", class Type_boo {});
				break;
			}
			case "dotted-name": {
				const names = node
					.flatten()
					.filter(node => node.type === "identifier")
					.map(node => node.lexeme);
				
				const name = names.splice(0, 1)[0];
				let namespace = scope;
				while (!namespace.has(name)) {
					namespace = namespace.get(PARENT);
					if (!namespace)
						throw `ReferenceError: "${name}" is not defined.`;
				}

				return names.reduce((namespace, name) => namespace.get(name), namespace);
			}
			case "import": {
				const name = node.children[1].lexeme;
				const from = node.children[3].children[0].lexeme;
				// TODO: Actually import "from"
				scope.set(name, new Map());
				break;
			}
			case "class": {
				const name = node.children[1].lexeme;
				const { offset } = interpret(node.select("class-block"), scope, name);
				i += offset;
				break;
			}
			case "function": {
				const name = node.children[1].lexeme;
				const { offset } = interpret(node.select("block"), scope, name);
				i += offset;
				break;
			}
			case "is-statement": {
				const names = node.children
					.slice(1, -1)
					.filter(node => node.lexeme !== ",")
					.map(node => node.select("dotted-name"))
					.map(node => {
						const { offset, value } = interpret(node);
						i += offset;
						return value;
					});
				for (const name of names) {
					let namespace = scope;
					while (!namespace.has(name)) {
						namespace = namespace.get(PARENT);
						if (!namespace)
							throw `ReferenceError: "${name}" is not defined.`;
					}
					scope.set(name, namespace.get(name));
				}
				break;
			}
		}
	}

	if (!parentscope)
		console.log(scope);
	
	return { offset: i, value };
};