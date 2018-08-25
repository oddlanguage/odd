const tokenTypes = {
	odd: new Map([
		["comment",     /\/\*[\s\S]+\*\/|\/\/.+[\r\n]/],
		["regex",       /\b\/.+\/[gmiyus]*\b/],
		["template",    /.+?`/],
		["string",      /.+?"/],
		["type",        /[\w\[\]\{\}]+:/u],
		["number",      /\b\d+\b|\.\d+\b|#\w+/],
		["separator",   /[\{\},]/],
		["operator",    /\+=|-=|\*=|\/=|%=|\*\*=|&=|\|=|\.\.=|\.{1,3}|==|!=|>=|<=|\+\+|--|~~|[-\.\/+><*=%~?!$|&^:]|\bthrow\b|\breturn\b|\bnew\b|\bdelete\b|\btypeof\b|\binstanceof|\bin\b|\bof\b/],
		["controller",  /\bfor\b|\bwhile\b|\bif\b|\belse\b|\bwhen\b|\bemits?\b/],
		["definition",  /\bstatic\b|\blocal\b|\bglobal\b|\bconst\b|\bpublic\b|\bdefine\b|\bfunction\b/],
		["structure",   /\btype\b|\bclass\b/],
		["namespace",   /\bthis\b|\busing\b/],
		["semicolon",   /;/],
		["parenthesis", /[\(\)]/],
		["list",        /[\[\]]/],
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

const lexemeRegularExpression = /`[\s\S]+?`|".+?"|\/\*[\s\S]+\*\/|\/\/.+\n|\/.+\/[gmiyus]*|#\w+|[-\/+><*=%~?!$|&^]+|\.?\d+|[\w\[\]\{\}]+:|\w+|\S/gu;
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

function lexToHTML (text, lexicalAnalysis) {
	let html =
	`<style>
		* {
			margin: 0;
			padding: 0;
		}
		body {
			line-height: 1.33rem;
			font-family: monospace;
			background: #222222;
			color: white;
			font-size: 1.25rem;
			padding: 1rem;
		}
		::selection {
			background: rgba(255, 255, 255, .25);
		}

		.definition {
			color: #52E3F6;
			font-style: italic;
			margin-left: -.15rem;
			padding-right: .15rem;
		}
		.type {
			color: #A6E22E;
			text-decoration: underline;
		}
		.number {
			color: #AE81FF;
		}
		.operator {
			color: #FF0080;
		}
		.string, .template, .regex {
			color: #E0CA48;
		}
		.separator, .semicolon, .parenthesis, .list {
			color: #909090;
		}
		.comment {
			color: #61617C;
		}
		.structure {
			color: #52E3F6;
			font-style: italic;
			margin-left: -.15rem;
			padding-right: .15rem;
		}
		.namespace {
			color: #FFA838;
			font-style: italic;
			margin-left: -.15rem;
			padding-right: .15rem;
		}
		.controller {
			color: #22FFA9;
		}
		.escaper {
			color: red;
			text-decoration: underline;
		}

		.comment, .string, .template {
			font-family: "script12 bt";
			font-size: 1rem;
			line-height: 1rem;
		}

		.structure+.identifier {
			text-decoration: underline;
		}
	</style><pre>`;
		let last;
		for (const token of lexicalAnalysis) {
			const insertion = `<span class="${token.type}">${token.lexeme}</span>`;
			if (last) {
				html += text.substring(last.end, token.start);
			}
			html += insertion;
			last = token;
		}
		html +=
	`</pre><script>
	//document.querySelectorAll(".definition, .comment, .structure").forEach(span => {
	//	span.innerHTML = span.textContent.replace(/f/g, "&fnof;");
	//});
	document.querySelectorAll(".number").forEach(span => {
		if (span.textContent[0] !== "#") return;
		span.style.color = span.textContent;
	});
	</script>`;
	return html;
}

exports.lexToHTML = lexToHTML;