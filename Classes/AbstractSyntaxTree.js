class AbstractNode {
	constructor (str) {
		this.value = str || "NONE";
	}
}

class AbstractSyntaxTree {
	constructor(lexicaltokenArray) {
		this.lexicalTokens = lexicaltokenArray;
		this.nodes = this.sprout();
	}
	sprout() {
		return this.lexicalTokens.map((token, i) => {
			let newToken = "";
			//Do some lookahead stuff
			switch (token.type) {
				case "string": {
					let lookAheadIndex = i;
					while (this.lexicalTokens[lookAheadIndex].type !== "string") {
						newToken += this.lexicalTokens[lookAheadIndex++].lexeme;
					}
					newToken += this.lexicalTokens[lookAheadIndex].lexeme;
					return new AbstractNode(newToken);
				}
				case "operator": {
					let lookAheadIndex = i;
					while (this.lexicalTokens[lookAheadIndex].type === "operator") {
						newToken += this.lexicalTokens[lookAheadIndex++].lexeme;
					}
					return new AbstractNode(newToken);
				}
				default: return new AbstractNode(token);
			}
		});
	}
}

exports.AbstractSyntaxTree = AbstractSyntaxTree;