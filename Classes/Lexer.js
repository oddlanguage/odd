const tokenTypes = {
	odd: new Map([
		["escaper",     /\\./                                                                                                                                                       ],
		["comment",     /\/\*[\s\S]+\*\/|\/\/.+\n/                                                                                                                                  ],
		["template",    /`/                                                                                                                                                         ],
		["string",      /"/                                                                                                                                                         ],
		["number",      /\b\d+\b|\.\d+\b/                                                                                                                                           ],
		["type",        /\w+[{\[]?[}\]]?:/ ],
		["separator",   /[;{}\[\],\()]/                                                                                                                                             ],
		["operator",    /\+=|-=|\*=|\/=|%=|\*\*=|&=|\|=|\.\.=|\.\.|==|!=|>=|<=|\+\+|--|~~|[-\.\/+><*=%~?!$|&^:]|\breturn\b|\bnew\b|\bdelete\b|\btypeof\b|\binstanceof|\bin\b|\bof\b/],
		["declaration", /\bstatic\b|\blocal\b|\bglobal\b|\bconst\b|\bpublic\b|\bdefine\b|\bƒ\b|\bfunction\b/                                                                        ]
	]),
	identifier: /[_a-zA-Z]\w*/u
};

function getLine (source, lineNumber) {
	const lineStart = source.split("\n", lineNumber - 1).join("\n").length;
	const lineEnd = source.split("\n", lineNumber).join("\n").length;
	return source.slice(lineStart, lineEnd).replace(/[\t\r\v]/g, "");
}

class LexicalToken {
	constructor (options) {
		this.lexeme = options.lexeme;
		this.type = LexicalToken.getType(options);
	}

	static getType(options) {
		const { lexeme, lineNumber, source } = options;
		for (const pair of tokenTypes.odd) {
			if (lexeme.match(pair[1])) {
				return pair[0];
			}
		}
		if (lexeme.match(tokenTypes.identifier)) {
			return "identifier";
		} else {
			const line = getLine(source, lineNumber);
			throw (
				`LexicalError: (At line ${lineNumber})\n
				${line}
				${" ".repeat(line.indexOf(lexeme))}${"^".repeat(lexeme.length)}
				Cannot identify lexeme type of "${lexeme}"`
			).replace(/[\t\r\v]/g, "");
		}
	}
}

const lexemeRegularExpression = /`.+?`|".+?"|\/\*[\s\S]+\*\/|\/\/.+\n|[-\/+><*=%~?!$|&^]+|\.?\d+|\w+[{\[]?[}\]]?:|\w+|\S/gu;
function generateLexicalAnalysis(str) {
	const tokens = [];
	let result;
	while (result = lexemeRegularExpression.exec(str)) {
		tokens.push(new LexicalToken({
			lexeme: result[0],
			lineNumber: (str.slice(0, result.index).match(/\n/g) || []).length + 1,
			source: str
		}));
	}
	return tokens;
}

exports.generateLexicalAnalysis = generateLexicalAnalysis;