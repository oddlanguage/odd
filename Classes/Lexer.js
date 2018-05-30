const lexemeRegularExpression = /\w+|[^\s]/gu;
const lexemeTypes = {
	all: new Map([
		["separator", /[;:{}\[\],\.()]/   ],
		["string",    /["`]/              ],
		["operator",  /[-\/+*<=>%~?!$|&^]/],
		["number",    /\b\d+\b/           ],
		["escaper",   /\\/                ]
	]),
	identifier: /[_a-zA-Z][\w]+/u
};

class LexicalToken {
	constructor(lexeme, start, end) {
		this.lexeme = lexeme;
		this.type = LexicalToken.getType(lexeme);
		this.start = start;
		this.end = end;
	}
	static getType(lexeme) {
		for (const pair of lexemeTypes.all) {
			if (lexeme.match(pair[1])) {
				return pair[0];
			}
		}
		return (lexeme.match(lexemeTypes.identifier)) ? "identifier" : "none";
	}
}

function generateLexicalAnalysis(str) {
	const tokens = [];
	let result;
	while (result = lexemeRegularExpression.exec(str)) {
		tokens.push(new LexicalToken(result[0], result.index, result.index + result[0].length));
	}
	return tokens;
}

exports.generateLexicalAnalysis = generateLexicalAnalysis;