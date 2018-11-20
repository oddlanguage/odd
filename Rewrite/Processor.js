module.exports = class Processor {
	constructor () {
		this.lexer = null;
		this.parser = null;
		this.preprocessor = null;
		this.compiler = null;
		this.plugins = [];
	}

	process (input) {
		//Parse input to AST
		//Transform AST with plugins defined by use()
		//Compile AST
		return this.parse(input)
			.then(AST => this.transform(AST))
			.then(transformedAST => this.compile(transformedAST));
	}

	set (key, value) {
		//Register custom behaviour such as "lexer", new Lexer()
		this[key] = value;
		return this;
	}

	use (plugin) {
		//If plugin instanceof ProcessorPlugin
		//	Register new plugin();
		//Elseif plugin instanceof Array
		//	For each item in array
		//		Register new plugin()
		//Elseif plugin instanceof Function
		//	call plugin();
		//Else
		//	throw new Error(`${typeof plugin} is not a valid plugin type.`);
		//Return this;
		this.plugins.push(plugin);
		return this;
	}

	parse (input) {
		//Tokenise input
		//Preprocess tokens if needed
		//Create AST from tokenised input
		//Return Promise<AST>
		return this.lexer
			.tokenise(input)
			.then(tokens => this.preprocessor ? this.preprocessor.preprocess : tokens)
			.then(this.parser.parse);
	}

	async transform (AST) {
		if (!this.plugins.length) return AST;
		//For every plugin
		//	call plugin.transformer(AST)
		//Return Promise<modifiedAST>
		const plugin = this.plugins.pop();
		if (plugin) AST = await this.transform(AST);
		return plugin.transformer(AST);
	}

	compile (AST) {
		//Turn AST into target [bytecode?]
			//Return Promise<target>
		return this.compiler.compile(AST);
	}
}