"use strict";
"hide implementation";

const Lexer = require("../../../Lexer-generator/Lexer-generator.js");

module.exports = new Lexer()
	.define("digit", /\d/)
	.ignore("comment", /\/\/[^\n]*\n?|\/\*[^*]*?\*\//)
	.ignore("weird-whitespace", /[\f\v]+/)
	.rule("string", /(?<!\\)".*?(?<!\\)"/)
	.rule("template-literal", /(?<!\\)`.*?(?<!\\)`/)
	.rule("semicolon", ";")
	.rule("punctuation", /[,\(\)]/)
	.rule("INDENT", /{\r*\n*/)
	.rule("DEDENT", /\r*\n*}/)
	.rule("object-start", "[")
	.rule("object-end", "]")
	.rule("type-annotation", /[a-zA-Z0-9$-_\[\]\{\}\<\>]*:/)
	.rule("not-equals", /!=/)
	.rule("equals-equals", /==/)
	.rule("operator", /[.=+\-/*%^~<>?&|!]|(?:new|exists|instanceof|typeof|in|and|or)/)
	.rule("controller", /auto|for|of|from|to|with|import|as|return|emits?|if|when|while|then|else|continue|throw|using|repeat|operator|iife/)
	.rule("preprocessor-directive", /#|def/)
	.rule("storage-type", /type|class|template/)
	.rule("function-keyword", /fun/)
	.rule("var-keyword", /const|var/)
	.rule("storage-modifier", /overt/)
	.rule("builtin", /Function|Array|Object|String|Boolean|Number|Math|Error/)
	.rule("decimal-number", /{digit}*\.{digit}+(?:e[+-]?{digit}+)?/i)
	.rule("integer-number", /{digit}+/)
	.rule("literal", /true|false|nothing|undefined/)
	.rule("identifier", /[a-zA-Z$_][a-zA-Z0-9$\-_]*/)
	.rule("decorator", /@{identifier}/)
	.usePythonBlocks();