const assert = require("../assert");

class Grammar {
	constructor () {
		//
	}

	type (...grammars) { //Maybe eat("/type")
		return this;
	}

	lexeme (...grammars) { //Maybe eat("lexeme")
		return this;
	}

	sub (...rules) {
		return this;
	}

	zeroOrMore (...grammars) {
		return this;
	}

	oneOrMore (...grammars) {
		return this;
	}

	optional (...grammars) {
		return this;
	}

	either (...grammars) {
		return this;
	}

	anyOf (...grammars) {
		return this;
	}
}

module.exports = class Parser {
	constructor () {
		this.rules = new Map();
	}

	rule (name, grammar) {
		//Grammar should be a function.
		//It will be called with a new Grammar class as its argument

		assert(typeof grammar === "function")
			.error(`Unsupported grammar [${grammar} ${(typeof grammar).capitalise()}]`);

		this.rules.set(name, grammar(new Grammar()));
		return this;
	}

	parse (tokens) {
		//Go through all rules
		//if no rules match and not all tokens are consumed throw error
		return Promise.resolve(tokens);
	}
}

// Example grammar \\

const parser = new Parser();
parser
	.rule("program", grammar => {
		grammar
			.oneOrMore.anyOf("expression", "statement");
	})
	.rule("expression", grammar => {
		grammar
			.anyOf(
				grammar.type("identifier"),
				grammar.sub("literal expression"), //"string", 123, [property = value;], [1, 2, 3]
				grammar.sub("call expression"), //identifier(arg, list)
				grammar.sub("parenthesis expression"), //( expr )
				grammar.sub("function expression"), //function a (args) {}
				grammar.sub("unary expression"), // typeof a, b exists (prefix & postfix) (maybe put in "operator expression"?)
				grammar.sub("binary expression"), // a * b, a / b, etc. (maybe put in "operator expression"?)
				grammar.sub("ternary expression"), //a ? b : c (maybe put in "operator expression"?)
				grammar.sub("dot member expression"), //obj.prop, maybe?.prop
				grammar.sub("index member expression")) //obj[i], maybe?[i]
			.type("phrase terminator");
	})
	.rule("statement", grammar => {
		grammar
			.anyOf(
				grammar.sub("declaration statement"),
				grammar.sub("try statement"),
				grammar.sub("switch statement"),
				grammar.sub("for of statement"),
				grammar.sub("foreach in statement"),
				grammar.sub("return statement"),
				grammar.sub("emit statement"),
				grammar.sub("when emits statement"),
				grammar.sub("while statement"),
				grammar.sub("continue statement"),
				grammar.sub("break statement"),
				grammar.sub("using statement"),
				grammar.sub("throw statement"),
				grammar.sub("repeat statement"),
				grammar.sub("if statement"));
	})
	.rule("block", grammar => {
		grammar
			.type("block start")
			.anyOf( //Should this be optional?
				grammar.oneOrMore("expression"),
				grammar.oneOrMore("statement"))
			.type("block end");
	})
	.rule("declaration statement", grammar => {
		grammar
			.type("storage type")
			.optional("type annotation")
			.type("identifier")
			.type("phrase terminator");
	})
	.rule("try statement", grammar => {
		grammar
			.lexeme("try")
			.sub("block")
			.optional.sub("catch statement") //transform methods to getters/setters so this can work?
			.optional.sub("finally statement"); //transform methods to getters/setters so this can work?
	})
	.rule("catch statement", grammar => {
		grammar
			.lexeme("catch")
			.sub("expression")
			.sub("block");
	})
	.rule("finally statement", grammar => {
		grammar
			.lexeme("finally")
			.sub("block");
	})
	.rule("case clause", grammar => {
		grammar
			.lexeme("case")
			.sub("expression")
			.sub("block");
	})
	.rule("default clause", grammar => {
		grammar
			.lexeme("default")
			.sub("block");
	})
	.rule("switch block", grammar => {
		grammar
			.type("block start")
			.zeroOrMore.sub("case clause") //transform methods to getters/setters so this can work?
			.optional.sub("default clause")
			.type("block end");
	})
	.rule("switch statement", grammar => {
		grammar
			.lexeme("switch")
			.sub("expression")
			.sub("switch block");
	})
	.rule("for of statement", grammar => {
		grammar
			.lexeme("for")
			//start of sub "for of expression"? (to allow optional parentheses)
			.sub("expression")
			.lexeme("of")
			.sub("expression")
			//end of sub "for of expression"?
			.either(
				grammar.sub("expression"),
				grammar.sub("block"));
	})
	.rule("foreach in statement", grammar => {
		grammar
			.lexeme("foreach")
			//start of sub "foreach in expression"? (to allow optional parentheses)
			.type("identifier")
			.lexeme("in")
			.sub("expression")
			//end of sub "foreach in expression"?
			.either(
				grammar.sub("expression"),
				grammar.sub("block"));
	})
	.rule("return statement", grammar => {
		grammar
			.lexeme("return")
			.optional.sub("expression")
			.type("phrase terminator");
	})
	.rule("emit statement", grammar => {
		grammar
			.lexeme("emit")
			.sub("expression")
			.type("phrase terminator");
	})
	.rule("when emits statement", grammar => {
		grammar
			.lexeme("when")
			.sub("expression")
			.lexeme("emits")
			.sub("expression")
			.either(
				grammar.sub("expression"),
				grammar.sub("block"));
	})
	.rule("while statement", grammar => {
		grammar
			.lexeme("while")
			.sub("expression")
			.either(
				grammar.sub("expression"),
				grammar.sub("block"));
	})
	.rule("continue statement", grammar => {
		grammar
			.lexeme("continue")
			.optional.sub("expression") // for continuing named loops?
			.type("phrase terminator");
	})
	.rule("break statement", grammar => {
		grammar
			.lexeme("break")
			.type("phrase terminator");
	})
	.rule("using statement", grammar => {
		grammar
			.lexeme("using")
			.sub("expression")
			.type("phrase terminator");
	})
	.rule("throw statement", grammar => {
		grammar
			.lexeme("throw")
			.sub("expression")
			.type("phrase terminator");
	})
	.rule("repeat statement", grammar => {
		grammar
			.lexeme("reapeat")
			.sub("expression")
			.either(
				grammar.sub("expression"),
				grammar.sub("block"));
	})
	.rule("else if statement", grammar => {
		grammar
			.lexeme("else")
			.lexeme("if")
			.sub("expression")
			.either(
				grammar.sub("expression"),
				grammar.sub("block"));
	})
	.rule("else statement", grammar => {
		grammar
			.lexeme("else")
			.either(
				grammar.sub("expression"),
				grammar.sub("block"));
	})
	.rule("if statement", grammar => {
		grammar
			.lexeme("if")
			.sub("expression")
			.either(
				grammar.sub("expression"),
				grammar.sub("block"))
			.zeroOrMore.sub("else if statement")
			.optional.sub("else statement");
	})
	.rule("property declaration statement", grammar => {
		grammar
			.optional.type("type annotation")
			.type("identifier")
			.optional(
				grammar.lexeme("=")
				.sub("expression"))
			.either(
				grammar.lexeme(","),
				grammar.type("phrase terminator"));
	})
	.rule("object literal expression" , grammar => {
		grammar
			.type("object start")
			.zeroOrMore.sub("property declaration statement")
			.type("object end");
	})
	.rule("literal expression", grammar => {
		grammar
			.anyOf(
				grammar.type("literal"),
				grammar.type("string"),
				grammar.type(/number/), //regex to check if (token.type.match("number") !== null) instead of (token.type === "number")
				grammar.sub("object literal expression"));
	})
	.rule("argument", grammar => {
		grammar
			.optional.type("type annotation")
			.type("identifier")
			.optional(
				grammar
					.lexeme("=")
					.sub("expression"));
	})
	.rule("arguments", grammar => {
		grammar
			.lexeme("(")
			.zeroOrMore(
				grammar.sub("argument"),
				grammar.lexeme(","))
			.optional.sub("argument")
			.lexeme(")");
	})
	.rule("call expression", grammar => {
		grammar
			.either(
				grammar.type("identifier"),
				grammar.sub("dot member expression"),
				grammar.sub("index member expression"))
			.sub("arguments");
	})
	.rule("parenthesis expression", grammar => {
		grammar
			.lexeme("(")
			.sub("expression")
			.lexeme(")");
	})
	.rule("function expression", grammar => {
		grammar
			.lexeme("function")
			.type("identifier")
			.sub("arguments")
			.sub("block");
	})
	.rule("unary expression", grammar => { //Should probably be split up into smaller grammars
		grammar
			.either(
				grammar
					.anyof(
						grammar.lexeme("+"),
						grammar.lexeme("-"),
						grammar.lexeme("!"),
						grammar.lexeme("not"),
						grammar.lexeme("typeof"))
					.sub("expression"),
				grammar
					.sub("expression")
					.lexeme("exists"));
	})
	.rule("binary expression", grammar => {
		grammar
			.sub("expression")
			.anyOf(
				grammar.lexeme("instanceof"),
				grammar.lexeme("^"),
				grammar.lexeme("*"),
				grammar.lexeme("/"),
				grammar.lexeme("%"),
				grammar.lexeme("+"),
				grammar.lexeme("-"),
				grammar.lexeme("<"),
				grammar.lexeme("<="),
				grammar.lexeme(">"),
				grammar.lexeme(">="),
				grammar.lexeme("and"),
				grammar.lexeme("or"))
			.sub("expression");
	})
	// .rule("ternary expression", grammar => {}) //This doesn't really work... We have to either hack this into other rules or accept: exp and alt1 or alt2
	.rule("dot member expression", grammar => {
		grammar
			.lexeme(".")
			.type("identifier");
	})
	.rule("index member expression", grammar => {
		grammar
			.type("object start")
			.sub("expression")
			.type("object end");
	});