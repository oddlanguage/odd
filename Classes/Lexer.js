const tokenTypes = {
	odd: new Map([
		["escaper",    /\\./                                                                                                                                                                 ],
		["comment",    /\/\*[\s\S]+\*\/|\/\/.+[\r\n]/                                                                                                                                        ],
		["template",   /`/                                                                                                                                                                   ],
		["string",     /"/                                                                                                                                                                   ],
		["type",       /[\w\[\]\{\}]+:/u                                                                                                                                                               ],
		["number",     /\b\d+\b|\.\d+\b/                                                                                                                                                     ],
		["separator",  /[;{}\[\],\()]/                                                                                                                                                       ],
		["operator",   /\+=|-=|\*=|\/=|%=|\*\*=|&=|\|=|\.\.=|\.{1,3}|==|!=|>=|<=|\+\+|--|~~|[-\.\/+><*=%~?!$|&^:]|\breturn\b|\bnew\b|\bdelete\b|\btypeof\b|\binstanceof|\bin\b|\bof\b|\busing\b/],
		["controller", /\bfor\b|\bwhile\b|\bif\b|\belse\b/                                                                                                                                   ],
		["definition", /\bstatic\b|\blocal\b|\bglobal\b|\bconst\b|\bpublic\b|\bdefine\b|\bfunction\b/                                                                                        ],
		["structure",  /\btype\b|\bclass\b/                                                                                                                                                  ],
		["this",       /\bthis\b/                                                                                                                                                            ]
	]),
	identifier: /[_a-zA-Z\u{1F600}-\u{1F64F}][\w\u{1F600}-\u{1F64F}]*/u
};

function getLine (source, lineNumber) {
	const lineStart = source.split("\n", lineNumber - 1).join("\n").length;
	const lineEnd = source.split("\n", lineNumber).join("\n").length;
	return source.slice(lineStart, lineEnd).replace(/[\t\r\v]/g, "");
}

class LexicalToken {
	constructor (options) {
		this.lexeme = options.lexeme;
		this.start = options.start;
		this.end = options.end;
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
				${" ".repeat(line.indexOf(lexeme) - (lineNumber > 1))}${"^".repeat(lexeme.length)}
				Cannot identify lexeme type of "${lexeme}"`
			).replace(/[\t\r\v]/g, "");
		}
	}
}

const lexemeRegularExpression = /`.+?`|".+?"|\/\*[\s\S]+\*\/|\/\/.+\n|[-\/+><*=%~?!$|&^]+|\.?\d+|[\w\[\]\{\}]+:|\w+|\S/gu;
function generateLexicalAnalysis(str) {
	const tokens = [];
	let result;
	while (result = lexemeRegularExpression.exec(str)) {
		tokens.push(new LexicalToken({
			lexeme: result[0],
			lineNumber: (str.slice(0, result.index).match(/\n/g) || []).length + 1,
			source: str,
			start: result.index,
			end: result.index + result[0].length
		}));
	}
	return tokens;
}

exports.generateLexicalAnalysis = generateLexicalAnalysis;