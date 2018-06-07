const { generateLexicalAnalysis } = require("./Classes/Lexer");
const { AbstractSyntaxTree } = require("./Classes/AbstractSyntaxTree");
const { AnnotatedSyntaxTree } = require("./Classes/AnnotatedSyntaxTree");
const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

console.log(fs.readFile);

let timestamps = [new Date()];
function timeSince () {
	const newDate = new Date();
	const lastDate = timestamps.shift();
	timestamps.push(newDate);
	return newDate - lastDate;
}

async function compile (from, to) {
	console.log(`Reading ${from}...`);
	const text = await readFile(from, "utf8");
	console.log(`  Succes! Read in ${timeSince()}ms.\n`);

	console.log("Starting lexical analysis...");
	const lexicalAnalysis = generateLexicalAnalysis(text);
	console.log(`  Succes! Lexed in ${timeSince()}ms.\n`);

	//console.log("Generating abstract syntax tree...");
	//const abstractSyntaxTree = new AbstractSyntaxTree(lexicalAnalysis);
	//console.log(`  Succes! Generated in ${timeSince()}ms.\n`);

	//console.log("Annotating abstract syntax tree...");
	//const annotatedSyntaxTree = new AnnotatedSyntaxTree(abstractSyntaxTree);
	//console.log(`  Succes! Annotated in ${timeSince()}ms.\n`);

	if (!to) return;
	let html =
`<style>
	body {
		line-height: 1.33rem;
		font-family: monospace;
		background: #222222;
		color: white;
		font-size: 1.25rem;
	}
	span {
		display: inline-block;
	}
	.declaration {
		color: #52E3F6;
		font-style: italic;
		margin-left: -.1rem;
	}
	.type {
		color: #A6E22E;
		text-decoration: underline;
	}
	.number {
		color: #AE81FF;
	}
	.operator {
		color: #F92672;
	}
	.string {
		color: #E6DB74;
	}
	.separator {
		color: #909090;
		margin: 0 .1rem;
	}
	.comment {
		color: #76cb58;
	}
</style>`;
	for (const token of lexicalAnalysis) {
		html += `\n<span class="${token.type}">${token.lexeme}</span>`;
		if (token.lexeme === ";" || token.type === "comment") html += "<br/>";
	}
	console.log(`Writing ${to}...`);
	await writeFile(to, html, "utf8");
	console.log(`  Succes! Wrote in ${timeSince()}ms.`);
}

const beforeCompile = new Date();
compile(`${__dirname}/odd/test.odd`, `${__dirname}/lexed/test.html`).then(() => {
	console.log(`\n> Compiling took ${new Date() - beforeCompile}ms in total.\n`);
	process.exit();
}).catch(err => {
	console.log(`  Error!\n\n${err}\n`);
});