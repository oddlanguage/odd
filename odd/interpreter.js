import Url from "url";
import Interpreter from "../Interpreter/Interpreter.js";
import { splitArray } from "../util.js";

// TODO: This should probably not be its own file?
// How is this linked to the parser generator?
const url = Url.resolve(import.meta.url, "../Parser/Parser.js");
const program = node => `import Parser from "${url}";\nconst { sequence, options, some, rule, type, lexeme, many, maybe } = Parser.combinators;\n\nexport default new Parser()\n\t${node.children.map(rule => `.rule("${rule.children[0].lexeme}", ${interpreter.interpret(rule)})`).join("\n\t")}`;

const metarule = node => interpreter.interpret(node.children[2]);

const chunks = node => {
	const containsAlternatives = node.children.find(node => node.type === "alternative");

	const body = node.children.map(node => (node.type !== "alternative")
		? interpreter.interpret(node)
		: node);

	const parsed = splitArray(body, node => node.type === "alternative").map(items => (items.length > 1)
		? `sequence(${items.join(", ")})`
		: items[0]);

	let builder = parsed.join(", ");
	if (parsed.length > 1) {
		builder = `${(containsAlternatives) ? "options" : "sequence"}(${builder})`;
	}
	return builder;
};

const parserNameFromSymbol = symbol => (()=>{switch(symbol){
	case "*": return "some";
	case "+": return "many";
	case "?": return "maybe";
}})();

const chunk = node => {
	// UGLY: Yucky ternaries :(
	const label = (node.children[0].type === "label")
		? node.children[0]
		: null;
	const body = (label)
		? node.children[1]
		: node.children[0];
	const quantifier = (node.children[(label) ? 2 : 1]?.type === "quantifier")
		? node.children[(label) ? 2 : 1]
		: null;
		
	let builder = interpreter.interpret(body);
	if (label)
		builder = `label("${label.children[0].lexeme}", ${builder})`;
	if (quantifier)
		builder = parserNameFromSymbol(quantifier.children[0].lexeme) + "(" + builder + ")";

	return builder;
};

const atom = node => {
	const { lexeme } = node.children[0];
	if (lexeme.startsWith("."))
		return `type("${lexeme.slice(1)}")`;
	if (lexeme.startsWith("\""))
		return `lexeme(${lexeme})`;
	else return `rule("${lexeme}")`;
};

const group = node => interpreter.interpret(node.children[1]);

const interpreter = new Interpreter();
export default interpreter
	.rule("program",     program)
	.rule("metarule",    metarule)
	.rule("chunks",      chunks)
	.rule("chunk",       chunk)
	.rule("atom",        atom)
	.rule("group",       group);