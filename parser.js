class AbstractSyntaxTree {
	constructor () {
		this.type = "program";
		this.body = [];
	}
}

class TreeNode {
	constructor (type, value) {
		this.type = type;
		this.value = value;
	}
}

exports.parse = function parse (lexicalTokens) {
	const ast = new AbstractSyntaxTree();
	let cursor = 0;

	function walk () {
		let token = lexicalTokens[cursor];

		if (token.type === "number") {
			cursor++;
			return new TreeNode("number literal", token.lexeme);
		}
		if (token.type === "string") {
			cursor++;
			return new TreeNode("string literal", token.lexeme);
		}
		console.log(ast);
		throw `ParseError: Parser does not recognise token type "${token.type}" with value "${token.lexeme}"`;
	}

	while (cursor < lexicalTokens.length) {
		ast.body.push(walk());
	}
	return ast;
}