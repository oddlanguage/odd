const { generateLexicalAnalysis } = require("./Classes/Lexer");
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
	console.log(`Writing ${to}...`);
	await writeFile(to, html, "utf8");
	console.log(`  Succes! Wrote in ${timeSince()}ms.`);
}

const beforeCompile = new Date();
compile({
	from: `${__dirname}/odd/test.odd`,
	to: `${__dirname}/lexed/test.html`
}).then(() => {
	console.log(`\n> Compiling took ${new Date() - beforeCompile}ms in total.\n`);
	process.exit();
}).catch(err => {
	console.log(`  Error!\n\n${err}`);
});