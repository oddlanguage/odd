class AbstractSyntaxTree {
	constructor (lexicaltokenArray) {
		this.sprout(lexicaltokenArray.filter(token => token.type !== "comment"));
	}
	sprout (input) {
		let i = 0;
		const output = [];
		const operators = [];
		//https://nl.wikipedia.org/wiki/Shunting-yardalgoritme
		while (i++ < input.length) {
			const token = input.slice(i, i + 1);
			if (["number", "identifier", "string", "template"].includes(token.type)) {
				output.push(token);
			}
		}
		return output;
	}
}

exports.AbstractSyntaxTree = AbstractSyntaxTree;