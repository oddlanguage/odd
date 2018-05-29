console.clear();
const fs = require("fs");

const M = {
	tokens: {
		PARSER_PLACEHOLDER              : /#&.+?\d+?#/g,
		PARSER_ARGUMENTLIST             : /function.*(\(.*?\))/g,
		PARSER_DEFINITION               : /\bdefine\b/g,
		DECLARATION_CONSTANT            : /\bconst\b/g,
		DECLARATION_SCOPE_LOCAL         : /\blocal\b/g,
		DECLARATION_SCOPE_GLOBAL        : /\bglobal\b/g,
		DECLARATION_FUNCTION            : /\b(?:ƒ|fnc|fun|func|function)\b(?![{}[\]])/g,
		DECLARATION_TYPE_NUMBER         : /(?:num|number):/g,
		DECLARATION_TYPE_INTEGER        : /(?:int|integer):/g,
		DECLARATION_TYPE_DECIMAL        : /(?:flo|float|decimal):/g,
		DECLARATION_TYPE_STRING         : /(?:str|string):/g,
		DECLARATION_TYPE_FUNCTION       : /(?:ƒ|fnc|fun|func|function):/g,
		DECLARATION_TYPE_BOOLEAN        : /(?:boo|bool|boolean):/g,
		DECLARATION_TYPE_NULL           : /(?:nil|nul|null):/g,
		DECLARATION_TYPE_OBJECT         : /(?:obj|object):|[\S]+?{}+?:|{.*?}:/g,
		DECLARATION_TYPE_ARRAY          : /(?:arr|array):|[\S]+?\[\]+?:|\[.*?\]:/g,
		DECLARATION_TYPE_ANYTHING       : /(?:any|anything):/g,
		LITERAL_NUMBER                  : /(?![a-zA-Z\s])\.?\d+[.\d]*/g,
		LITERAL_STRING                  : /".+?"/g,
		LITERAL_TEMPLATE                : /`.+?`/g,
		LITERAL_TEMPLATE_PLACEHOLDER    : /`.*?(\${.*?}).*?`/g,
		LITERAL_ARRAY                   : /\[.+?\]/g,
		LITERAL_OBJECT                  : /[^)$] {(.+?)}/gs,
		LITERAL_FUNCTION                : /\b(?:ƒ|fnc|fun|func|function)\b[^[\]{}].+?{(.+?)}/gs,
		LITERAL_BOOLEAN_TRUE            : /\btrue\b/g,
		LITERAL_BOOLEAN_FALSE           : /\bfalse\b/g,
		EXPRESSION_THIS                 : /\bthis\b/g,
		EXPRESSION_NEW                  : /\bnew\b/g,
		SEPARATOR_SEMICOLON             : ";",
		SEPARATOR_COMMA                 : ",",
		SEPARATOR_LPAREN                : "(",
		SEPARATOR_RPAREN                : ")",
		OPERATOR_TERNARY                : /\((.+)\)\s?\?\s?(.+?)\s?:\s?(.+)/g,
		OPERATOR_UNARY_DELETE           : /\bdelete\b/g,
		OPERATOR_UNARY_RETURN           : /\breturn\b/g,
		OPERATOR_RELATIONAL_IN          : /\bin\b/g,
		OPERATOR_RELATIONAL_TYPEOF      : /\btypeof\b/g,
		OPERATOR_RELATIONAL_INSTOF      : /\binstanceof\b/g,
		OPERATOR_ASSIGNMENT_ADDEQL      : "+=",
		OPERATOR_ASSIGNMENT_MINEQL      : "-=",
		OPERATOR_ASSIGNMENT_MULEQL      : "*=",
		OPERATOR_ASSIGNMENT_DIVEQL      : "/=",
		OPERATOR_ASSIGNMENT_MODEQL      : "%=",
		OPERATOR_ASSIGNMENT_EXPEQL      : "**=",
		OPERATOR_ASSIGNMENT_ANDEQL      : "&=",
		OPERATOR_ASSIGNMENT_OREQL       : "|=",
		OPERATOR_ASSIGNMENT_CONCATEQL   : "..=",
		OPERATOR_COMPARISON_EQL         : "==",
		OPERATOR_COMPARISON_NOTEQL      : "!=",
		OPERATOR_ASSIGNMENT_EQL         : "=",
		OPERATOR_COMPARISON_GRTRTHNOREQL: ">=",
		OPERATOR_COMPARISON_GRTRTHN     : ">",
		OPERATOR_COMPARISON_LSSTHNOREQL : "<=",
		OPERATOR_COMPARISON_LSSTHN      : "<",
		OPERATOR_ARITHMETIC_MOD         : "%",
		OPERATOR_ARITHMETIC_INC         : "++",
		OPERATOR_ARITHMETIC_DEC         : "--",
		OPERATOR_ARITHMETIC_ADD         : "+",
		OPERATOR_ARITHMETIC_MIN         : "-",
		OPERATOR_LOGICAL_NOT            : "!",
		OPERATOR_LOGICAL_AND            : "&",
		OPERATOR_LOGICAL_OR             : "|",
		OPERATOR_STRING_CONCAT          : "..",
		OPERATOR_ARITHMETIC_BOOLSHIFT   : "~~", //transform true/false into 1/-1: ~~x = (2*x-1)
		COMMENT_SINGLELINE              : /\/\/.*/g,
		COMMENT_MULTILINE               : /\/\*.+?\*\//g,
		COMMENT_ANY                     : /\/\/.*|\/*.+?\*\//g,
	},
	ignoreComments: true
};

class LexicalToken {
	constructor (raw) {
		this.value = raw;
		this.type = this.getType(this.value);
	}

	getType (raw) {
		for (const typeName in M.tokens) {
			const pattern = M.tokens[typeName];
			const match = (typeof pattern === "string") ? (raw === pattern) : raw.match(pattern);
			if (match) {
				return typeName;
			}
		}
		return "IDENTIFIER";
	}
}

class LexicalExpression {
	constructor (raw) {
		this.raw = raw;
		this.tokens = [];
		this.tokenise();
	}
	
	tokenise () {
		this.raw.split(" ").forEach(token => {
			this.tokens.push(new LexicalToken(token));
		});
	}
}

class LexicalScope {
	constructor (str) {
		this.expressions = [];
		this["ƒ"] = [];  // Functions
		this["🔣"] = []; // Strings
		this["💬"] = []; // Comments
		this["📦"] = []; // Objects
		this["🗃️"] = []; // Arrays
		this["📨"] = []; // Argument lists
		str = str.replace(M.tokens.LITERAL_STRING, string => {
			this["🔣"].push(string);
			return `#&🔣${this["🔣"].length}#`;
		});

		str = str.replace(M.tokens.LITERAL_TEMPLATE, template => {
			this["🔣"].push(template);
			return `#&🔣${this["🔣"].length}#`;
		});

		str = str.replace(M.tokens.COMMENT_ANY, comment => {
			if (M.ignoreComments) return "";
			this["💬"].push(comment);
			return `#&💬${this["💬"].length}#`;
		});

		str = str.replace(M.tokens.LITERAL_ARRAY, array => {
			this["🗃️"].push(array);
			return `#&🗃️${this["🗃️"].length}#`;
		});

		str = str.replace(M.tokens.LITERAL_OBJECT, (match, object) => {
			this["📦"].push(new LexicalScope(object));
			return match.replace(object, `#&📦${this["📦"].length}#`);
		});

		str = str.replace(M.tokens.LITERAL_FUNCTION, (match, func) => {
			this["ƒ"].push(new LexicalScope(func));
			return match.replace(func, `#&ƒ${this["ƒ"].length}#;`);
		});

		str = str.replace(M.tokens.PARSER_ARGUMENTLIST, (match, argList) => {
			this["📨"].push(new LexicalScope(argList));
			return match.replace(argList, `#&📨${this["📨"].length}#;`);
		});

		this.raw = str;

		str = minify(str);

		str.split(";").forEach(expression => {
			if (!["", ";"].includes(expression)) {
				this.expressions.push(new LexicalExpression(expression));
			}
		});
	}
}

function minify (str) {
	return str.replace(/[\t\r\n]+|\s{2,}/g, "");
}

function compile (from, to) {
	fs.readFile(from, "utf8", (err, str) => {
		console.log(`Reading ${from}...`);
		if (err) throw err;

		const doc = new LexicalScope(str);

		fs.writeFile(to, JSON.stringify(doc, null, "\t"), "utf8", err => {
			console.log(`Writing ${to}...`);
			if (err) throw err;
			console.log(`Succes!`);
			process.exit();
		});
	});
}

compile(`${__dirname}/m/test.txt`, `${__dirname}/lexed/test.json`);