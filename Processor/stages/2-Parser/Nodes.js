class Program {
	constructor () {
		this.expressions = [];
	}

	addNode (node) {
		this.expressions.push(node);
		return this;
	}
}

class ConstDefinition {
	constructor (value) {
		this.value = value;
	}
}

class VarDefinition {
	constructor (value) {
		this.value = value;
	}
}

class Declaration {
	constructor (type, name, value) {
		this.type = type;
		this.name = name;
		this.value = value;
	}
}

class ExponentiationExpression {
	constructor (lhs, rhs) {
		this.lhs = lhs;
		this.rhs = rhs;
	}
}

class MultiplicationExpression {
	constructor (lhs, rhs) {
		this.lhs = lhs;
		this.rhs = rhs;
	}
}

class DivisionExpression {
	constructor (lhs, rhs) {
		this.lhs = lhs;
		this.rhs = rhs;
	}
}

class AdditionExpression {
	constructor (lhs, rhs) {
		this.lhs = lhs;
		this.rhs = rhs;
	}
}

class SubtractionExpression {
	constructor (lhs, rhs) {
		this.lhs = lhs;
		this.rhs = rhs;
	}
}

module.exports = {
	Program,
	ConstDefinition,
	VarDefinition,
	Declaration,
	ExponentiationExpression,
	MultiplicationExpression,
	DivisionExpression,
	AdditionExpression,
	SubtractionExpression
};