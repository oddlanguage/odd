const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const { tokenise } = require("./lexer");
const { parse } = require("./parser");

async function compile (options) {
	const { from, to } = options;
	const input = await readFile(from, "utf8");

	if (options.verbose) console.log("[TIMESTAMP] Starting Lexical Analysis.");
	const lexicalTokens = tokenise(input, {
		verbose: options.verbose,
		sourcepath: from,
		extensive: true,
		//ignoreTypes: true,
		allowUnicode: false
	});
	//const abstractSyntaxTree = parse(lexicalTokens/*.filter(token => ["string", "number"].includes(token.type))*/);
	//Actually compile

	if (to)	{
		await writeFile(to, JSON.stringify(lexicalTokens, null, "\t"), "utf8");
	}
	console.log("Done!");
}

const CustomError = require("./Classes/Errors/CustomError");

compile({
	from: `${__dirname}/_Source/test.odd`,
	to:   `${__dirname}/_Compiled/test.json`,
	verbose: true
}).catch(error => {
	console.log("\nAn error occured, aborting...");
	if (error instanceof CustomError) {
		console.log(error.toString());
	} else {
		console.log(error);
	}
});