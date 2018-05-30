const { generateLexicalAnalysis } = require("./Classes/Lexer");
const { AbstractSyntaxTree } = require("./Classes/AbstractSyntaxTree");
const { AnnotatedSyntaxTree } = require("./Classes/AnnotatedSyntaxTree");
const fs = require("fs");

const oddLang = new Map(
	["declaration", /\bstatic\b|\blocal\b|\bglobal\b|\bconst\b|\bpublic\b|\bdefine\b|\bƒ\b|\bfunction\b/],
	["operator",    /\breturn\b|\bnew\b|\bdelete\b|\btypeof\b|\binstanceof|\bin\b/],
	["type",        /\bany\b|\bnum\b|\bint\b|\bdec\b|\bstr\b|\bfun\b|\bfnc\b|\bbool\b|\bboo\b|\bnull\b|\bnul\b|\bnil\b|\bobj\b|\barr\b/]
);

let timestamps = [new Date()];
function timeSince () {
	const newDate = new Date();
	const lastDate = timestamps.shift();
	timestamps.push(newDate);
	return newDate - lastDate;
}

function compile (from, to) {
	console.log(`Reading ${from}...`);
	fs.readFile(from, "utf8", (err, str) => {
		if (err) throw err;
		console.log(`Read in ${timeSince()}ms.\n`);

		const lexicalAnalysis = generateLexicalAnalysis(str);
		console.log(`Lexed in ${timeSince()}ms.\n`);

		const abstractSyntaxTree = new AbstractSyntaxTree(lexicalAnalysis);
		console.log(`Generated abstract syntax tree in ${timeSince()}ms.\n`);
		
		const annotatedSyntaxTree = new AnnotatedSyntaxTree(abstractSyntaxTree);
		console.log(`Generated annotated syntax tree in ${timeSince()}ms.\n`);
		
		console.log(abstractSyntaxTree.nodes);

		if (!to) process.exit();
		console.log(`Writing ${to}...`);
		fs.writeFile(to, JSON.stringify(annotatedSyntaxTree, null, "\t"), "utf8", err => {
			if (err) throw err;
			console.log(`Succes!`);
			console.log(`Wrote in ${timeSince()}ms.`);
			process.exit();
		});
	});
}

compile(`${__dirname}/m/test.txt`);//, `${__dirname}/lexed/test.json`);