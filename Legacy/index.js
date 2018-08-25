const { generateLexicalAnalysis, lexToHTML } = require("./Classes/Lexer");
const { AbstractSyntaxTree } = require("./Classes/AbstractSyntaxTree");
const { AnnotatedSyntaxTree } = require("./Classes/AnnotatedSyntaxTree");
const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const timestamps = [new Date()];
function timeSince () {
	const newDate = new Date();
	const lastDate = timestamps.shift();
	timestamps.push(newDate);
	return newDate - lastDate;
}

async function compile (options) {
	const from = options.from;
	const to = options.to;
	console.log(`Reading ${from}...`);
	const text = await readFile(from, "utf8");
	console.log(`  Succes! Read in ${timeSince()}ms.`);

	console.log("Starting lexical analysis...");
	const lexicalAnalysis = generateLexicalAnalysis(text);
	console.log(`  Succes! Lexed in ${timeSince()}ms.`);

	console.log("Generating abstract syntax tree...");
	const abstractSyntaxTree = new AbstractSyntaxTree(lexicalAnalysis);
	console.log(abstractSyntaxTree);
	console.log(`  Succes! Generated in ${timeSince()}ms.`);

	//console.log("Annotating abstract syntax tree...");
	//const annotatedSyntaxTree = new AnnotatedSyntaxTree(abstractSyntaxTree);
	//console.log(`  Succes! Annotated in ${timeSince()}ms.\n`);

	if (!to) return;
	
	console.log(`Writing ${to}...`);
	await writeFile(to, lexToHTML(text, lexicalAnalysis), "utf8");
	console.log(`  Succes! Wrote in ${timeSince()}ms.`);
}

const beforeCompile = new Date();
compile({
	from: `${__dirname}/odd/test.odd`//,
	//to: `${__dirname}/lexed/test.html`
}).then(() => {
	console.log(`\n> Compiling took ${new Date() - beforeCompile}ms in total.\n`);
	process.exit();
}).catch(err => {
	console.log(`  Error!\n\n${err}`);
});