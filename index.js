const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const { lexer } = require("./lexer");

async function compile (options) {
	const { from, to } = options;
	const input = await readFile(from, "utf8");

	const lexicalTokens = lexer(input, from);
	const abstractSyntaxTree = parser(lexicalTokens);
	//Actually compile

	if (to)	{
		await writeFile(to, JSON.stringify(lexicalTokens, null, "\t"), "utf8");
	}
	console.log("Done!");
}

compile({
	from: `${__dirname}/odd/test.odd`//,
	//to:   `${__dirname}/compiled/test.json`
}).catch(error => {
	console.log(error);
});