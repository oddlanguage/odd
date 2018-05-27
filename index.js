console.clear();
const fs = require("fs");

const M = {
	tokens: {
		PARSER_PLACEHOLDER               : /#&.+?\d+?#/g,
		DECLARATION_CONSTANT             : "const",
		DECLARATION_LOCAL                : "local",
		DECLARATION_DEFINE               : "define",
		DECLARATION_FUNCTION_VERBOSE     : "function",
		DECLARATION_TYPE_NUMBER_SHORT    : "num:",
		DECLARATION_TYPE_NUMBER_VERBOSE  : "number:",
		DECLARATION_TYPE_INTEGER_SHORT   : "int:",
		DECLARATION_TYPE_INTEGER_VERBOSE : "integer:",
		DECLARATION_TYPE_DECIMAL_SHORT   : "flo:",
		DECLARATION_TYPE_DECIMAL_INTERM  : "float:",
		DECLARATION_TYPE_DECIMAL_VERBOSE : "decimal:",
		DECLARATION_TYPE_STRING_SHORT    : "str:",
		DECLARATION_TYPE_STRING_VERBOSE  : "string:",
		DECLARATION_TYPE_FUNCTION_SHORT  : "fun:",
		DECLARATION_TYPE_FUNCTION_INTERM : "func:",
		DECLARATION_TYPE_FUNCTION_VERBOSE: "function:",
		DECLARATION_TYPE_BOOLEAN_SHORT   : "boo:",
		DECLARATION_TYPE_BOOLEAN_INTERM  : "bool:",
		DECLARATION_TYPE_BOOLEAN_VERBOSE : "boolean:" ,
		DECLARATION_TYPE_NULL_SHORT      : "nil:",
		DECLARATION_TYPE_NULL_INTERM     : "nul:",
		DECLARATION_TYPE_NULL_VERBOSE    : "null:",
		DECLARATION_TYPE_OBJECT_SHORT    : "obj:",
		DECLARATION_TYPE_OBJECT_VERBOSE  : "object:",
		DECLARATION_TYPE_ARRAY_SHORT     : "arr:",
		DECLARATION_TYPE_ARRAY_VERBOSE   : "array:",
		DECLARATION_TYPE_ANYTHING_SHORT  : "any:",
		DECLARATION_TYPE_ANYTHING_VERBOSE: "anything:",
		LITERAL_NUMBER                   : /0?\.?\d+/g,
		LITERAL_STRING                   : /".+?"/g,
		LITERAL_TEMPLATE                 : /`.+?`/g,
		LITERAL_TEMPLATE_PLACEHOLDER     : /`.*?(\${.*?}).*?`/g,
		LITERAL_ARRAY                    : /\[.+?\]/g,
		LITERAL_OBJECT                   : /[^)$] ({.+?})/gs,
		LITERAL_FUNCTION                 : /function.+?({.+?})/gs,
		LITERAL_BOOLEAN_TRUE             : "true",
		LITERAL_BOOLEAN_FALSE            : "false",
		EXPRESSION_THIS                  : "this",
		EXPRESSION_NEW                   : "new",
		SEPARATOR_SEMICOLON              : ";",
		SEPARATOR_COMMA                  : ",",
		SEPARATOR_LPAREN                 : "(",
		SEPARATOR_RPAREN                 : ")",
		OPERATOR_TERNARY                 : /\((.+)\)\s?\?\s?(.+?)\s?:\s?(.+)/g,
		OPERATOR_UNARY_DELETE            : "delete",
		OPERATOR_UNARY_RETURN            : "return",
		OPERATOR_RELATIONAL_IN           : "in",
		OPERATOR_RELATIONAL_TYPEOF       : "typeof",
		OPERATOR_RELATIONAL_INSTOF       : "instanceof",
		OPERATOR_ASSIGNMENT_ADDEQL       : "+=",
		OPERATOR_ASSIGNMENT_MINEQL       : "-=",
		OPERATOR_ASSIGNMENT_MULEQL       : "*=",
		OPERATOR_ASSIGNMENT_DIVEQL       : "/=",
		OPERATOR_ASSIGNMENT_MODEQL       : "%=",
		OPERATOR_ASSIGNMENT_EXPEQL       : "**=",
		OPERATOR_ASSIGNMENT_ANDEQL       : "&=",
		OPERATOR_ASSIGNMENT_OREQL        : "|=",
		OPERATOR_ASSIGNMENT_CONCATEQL    : "..=",
		OPERATOR_COMPARISON_EQL          : "==",
		OPERATOR_COMPARISON_NOTEQL       : "!=",
		OPERATOR_ASSIGNMENT_EQL          : "=",
		OPERATOR_COMPARISON_GRTRTHNOREQL : ">=",
		OPERATOR_COMPARISON_GRTRTHN      : ">",
		OPERATOR_COMPARISON_LSSTHNOREQL  : "<=",
		OPERATOR_COMPARISON_LSSTHN       : "<",
		OPERATOR_ARITHMETIC_MOD          : "%",
		OPERATOR_ARITHMETIC_INC          : "++",
		OPERATOR_ARITHMETIC_DEC          : "--",
		OPERATOR_ARITHMETIC_ADD          : "+",
		OPERATOR_ARITHMETIC_MIN          : "-",
		OPERATOR_LOGICAL_NOT             : "!",
		OPERATOR_LOGICAL_AND             : "&",
		OPERATOR_LOGICAL_OR              : "|",
		OPERATOR_STRING_CONCAT           : "..",
		OPERATOR_ARITHMETIC_BOOLSHIFT    : "~~", //transform true/false into 1/-1: ~~x = (2*x-1)
		COMMENT_SINGLELINE               : /\/\/.*/g,
		COMMENT_MULTILINE                : /\/\*.+?\*\//g,
		COMMENT_ANY                      : /\/\/.*|\/*.+?\*\//g
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
		this["📜"] = []; // Templates
		str = str.replace(M.tokens.LITERAL_STRING, string => {
			this["🔣"].push(string);
			return `#&🔣${this["🔣"].length}#`;
		});

		str = str.replace(M.tokens.COMMENT_ANY, comment => {
			if (M.ignoreComments) return "";
			this["💬"].push(comment);
			return `#&💬${this["💬"].length}#`;
		});

		str = str.replace(M.tokens.LITERAL_TEMPLATE, template => {
			this["📜"].push(template);
			return `#&📜${this["📜"].length}#`;
		});

		str = str.replace(M.tokens.LITERAL_OBJECT, (match, object) => {
			this["📦"].push(new LexicalScope(object));
			return match.replace(object, `#&📦${this["📦"].length}#`);
		});

		str = str.replace(M.tokens.LITERAL_FUNCTION, (match, func) => {
			this["ƒ"].push(new LexicalScope(func));
			return match.replace(func, `#&ƒ${this["ƒ"].length}#;`);
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

		fs.writeFile(to, JSON.stringify(doc, null, 2), "utf8", err => {
			console.log(`Writing ${to}...`);
			if (err) throw err;
			console.log(`Succes!`);
			process.exit();
		});
	});
}

compile(`${__dirname}/m/test.txt`, `${__dirname}/lexed/test.json`);