class Leaf {
	constructor (token) {
		this.type = this.getType(token);
		this.left = "";
		this.right = "";
	}

	getType (token) {
		//Fix this lol
		return token.type;
	}
}

class AbstractSyntaxTree {
	constructor (lexicaltokenArray) {
		this.nodes = this.sprout(lexicaltokenArray);
	}
	sprout (lexicaltokenArray) {
		const output = [];
		for (const token of lexicaltokenArray) {
			if (token.type === "comment") continue;
			if (token.lexeme === ";") break; //debug;
			output.push(token);
		}
		return output;
	}
}

exports.AbstractSyntaxTree = AbstractSyntaxTree;