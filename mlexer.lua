--[[ https://developer.mozilla.org/nl/docs/Web/JavaScript/Guide/Expressions_and_Operators for reference
	declare a function with "function" or "ƒ"
	datatypes:
	-short        | num    | int     | flo     | str    | fun      | boo      | nil  | obj    | arr   | any      |
	-intermediate |        |         | float   |        | func     | bool     | nul  |        |       |          |
	-verbose      | number | integer | decimal | string | function | boolean  | null | object | array | anything |
	Parser settings:
		type checking: ignore, coerce, enforce
	Multiple possible
	type: create your own type by providing a type checking function. e.g.
		type Vector {
			return typeof this.x == "number" && typeof this.y == "number";
		}
]]--

local toBeCompiled = [[
const int: a = 13;
local flo: b = 12;
const [str, obj]: peter = {};

const str: function a (str: text = "Hallo") {
	local arr: namen = ["Gert", "Harry", "Frank"];
	return `${text} namen[3]`;
};

local obj: gert = {
	bool: gay = true;
};

local str: frank = (gert.gay) ? "Gerts vriendje" : "Eenzaam";
]];

local testString = [[
const str: name = "Gert";
const int: age = 12;
const str: greeting = `${name} is ${age} years old.`;
]];

local M = {
	tokens = {
		DECLARATION_CONSTANT              = "const",
		DECLARATION_LOCAL                 = "local",
		DECLARATION_DEFINE                = "define",
		DECLARATION_FUNCTION_VERBOSE      = "function",
		DECLARATION_FUNCTION_SHORT        = "ƒ",
		DECLARATION_TYPE_NUMBER_SHORT     = "num:",
		DECLARATION_TYPE_NUMBER_VERBOSE   = "number:",
		DECLARATION_TYPE_INTEGER_SHORT    = "int:",
		DECLARATION_TYPE_INTEGER_VERBOSE  = "integer:",
		DECLARATION_TYPE_DECIMAL_SHORT    = "flo:",
		DECLARATION_TYPE_DECIMAL_INTERM   = "float:",
		DECLARATION_TYPE_DECIMAL_VERBOSE  = "decimal:",
		DECLARATION_TYPE_STRING_SHORT     = "str:",
		DECLARATION_TYPE_STRING_VERBOSE   = "string:",
		DECLARATION_TYPE_FUNCTION_SHORT   = "fun:",
		DECLARATION_TYPE_FUNCTION_INTERM  = "func:",
		DECLARATION_TYPE_FUNCTION_VERBOSE = "function:",
		DECLARATION_TYPE_BOOLEAN_SHORT    = "boo:",
		DECLARATION_TYPE_BOOLEAN_INTERM   = "bool:",
		DECLARATION_TYPE_BOOLEAN_VERBOSE  = "boolean:" ,
		DECLARATION_TYPE_NULL_SHORT       = "nil:",
		DECLARATION_TYPE_NULL_INTERM      = "nul:",
		DECLARATION_TYPE_NULL_VERBOSE     = "null:",
		DECLARATION_TYPE_OBJECT_SHORT     = "obj:",
		DECLARATION_TYPE_OBJECT_VERBOSE   = "object:",
		DECLARATION_TYPE_ARRAY_SHORT      = "arr:",
		DECLARATION_TYPE_ARRAY_VERBOSE    = "array:",
		DECLARATION_TYPE_ANYTHING_SHORT   = "any:",
		DECLARATION_TYPE_ANYTHING_VERBOSE = "anything:",
		LITERAL_DIGIT                     = {"%d"},
		LITERAL_STRING                    = {'[%b""]'},
		LITERAL_TEMPLATE                  = {"%b``"},
		LITERAL_ARRAY                     = {"%b%[%]"},
		LITERAL_OBJECT                    = {"%b{}"},
		LITERAL_BOOLEAN_TRUE              = "true",
		LITERAL_BOOLEAN_FALSE             = "false",
		EXPRESSION_THIS                   = "this",
		EXPRESSION_NEW                    = "new",
		SEPARATOR_SEMICOLON               = ";",
		SEPARATOR_COMMA                   = ",",
		SEPARATOR_LPAREN                  = "(",
		SEPARATOR_RPAREN                  = ")",
		SEPARATOR_LCURLBRACK              = "{",
		SEPARATOR_RCURLBRACK              = "}",
		OPERATOR_TERNARY                  = {"%(.-%) %? .- : .-"},
		OPERATOR_UNARY_DELETE             = "delete",
		OPERATOR_UNARY_RETURN             = "return",
		OPERATOR_RELATIONAL_IN            = "in",
		OPERATOR_RELATIONAL_TYPEOF        = "typeof",
		OPERATOR_RELATIONAL_INSTOF        = "instanceof",
		OPERATOR_ASSIGNMENT_EQL           = "=",
		OPERATOR_ASSIGNMENT_ADDEQL        = "+=",
		OPERATOR_ASSIGNMENT_MINEQL        = "-=",
		OPERATOR_ASSIGNMENT_MULEQL        = "*=",
		OPERATOR_ASSIGNMENT_DIVEQL        = "/=",
		OPERATOR_ASSIGNMENT_MODEQL        = "%=",
		OPERATOR_ASSIGNMENT_EXPEQL        = "**=",
		OPERATOR_ASSIGNMENT_ANDEQL        = "&=",
		OPERATOR_ASSIGNMENT_OREQL         = "|=",
		OPERATOR_ASSIGNMENT_CONCATEQL     = "..=",
		OPERATOR_COMPARISON_EQL           = "==",
		OPERATOR_COMPARISON_NOTEQL        = "!=",
		OPERATOR_COMPARISON_GRTRTHN       = ">",
		OPERATOR_COMPARISON_GRTRTHNOREQL  = ">=",
		OPERATOR_COMPARISON_LSSTHN        = "<",
		OPERATOR_COMPARISON_LSSTHNOREQL   = "<=",
		OPERATOR_ARITHMETIC_MOD           = "%",
		OPERATOR_ARITHMETIC_INC           = "++",
		OPERATOR_ARITHMETIC_DEC           = "--",
		OPERATOR_ARITHMETIC_ADD           = "+",
		OPERATOR_ARITHMETIC_MIN           = "-",
		OPERATOR_LOGICAL_NOT              = "!",
		OPERATOR_LOGICAL_AND              = "&",
		OPERATOR_LOGICAL_OR               = "|",
		OPERATOR_STRING_CONCAT            = ".."
	--OPERATOR_ARITHMETIC_BOOLSHIFT     = "~~" -- transform true/false into 1/-1: ~~x == (2*x-1)
	}
};

local function Token (type, value)
	return {
		type = type,
		value = value
	}
end

local function Expression (raw, tokens)
	return {
		raw = raw,
		tokens = tokens
	}
end

local function Scope (raw)
	return {
		raw = raw,
		expressions = {}
	}
end

local function escapeString (str)
	return str:gsub("[%(%)%.%%%+%-%*%?%[%]%^%$]", "%%%0");
end

local function getTokens (expressionString)
	local tokens = {};
	--Get all tokens
	for token in string.gmatch(expressionString, "(.-)[ ;]") do
		local saved = nil;
		for tokenType, tokenValue in pairs(M.tokens) do
			if type(tokenValue) == "table" then
				if token:match(tokenValue[1]) then --Patterns are enclosed in tables
					table.insert(tokens, Token(tokenType, token));
					saved = tokenType;
					break;
				end
			else
				if token == tokenValue then --Generic tokens are just strings
					table.insert(tokens, Token(tokenType, token));
					saved = tokenType;
					break;
				end
			end
		end
		if not saved then --If no token was matched, it must be an identifier.
			table.insert(tokens, Token("IDENTIFIER", token));
		end
	end
	--Re-insert semicolon
	table.insert(tokens, Token("SEPARATOR_SEMICOLON", ";"));
	return tokens;
end

local function lex (str, scope)
	for line in str:gmatch(".-;") do
		line = line:gsub("%c", "");
		table.insert(scope.expressions, Expression(line, getTokens(line)));
	end
	return scope;
end

function M:getLexicalDocumentModel (str)
	str = escapeString(str:gsub("//.-\n", ""):gsub("%c", ""));
  return lex(str, Scope(str));
end

function printTable (tbl, indent)
  if not indent then indent = 0 end
  for k, v in pairs(tbl) do
    local formatting = string.rep(" ", indent) .. k .. ":\t";
    if type(v) == "table" then
      print(formatting);
      printTable(v, indent+1);
    else
      print(formatting..tostring(v));
    end
  end
end

print(testString:gsub("\t", "").."\n----------\n");
local lexicalDocumentModel = M:getLexicalDocumentModel(testString);
printTable(lexicalDocumentModel);