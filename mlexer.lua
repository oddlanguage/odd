--[[
	declare a function with "function" or "ƒ"
	datatypes:
	-short        | num    | int     | flo     | str    | fun      | boo      | nil  | obj    | arr
	-intermediate |        |         | float   |        | func     | bool     | nul  |        |    
	-verbose      | number | integer | decimal | string | function | boolean  | null | object | array
	Parser settings:
		type checking: ignore, coerce, enforce
]]--

local toBeCompiled = [[
const int: a = 13;
local int: b = 12;

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
	const int: a = 13;
	local int: b = 12;
]];

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

local function Scope ()
	return {
		expressions = {}
	}
end

local M = {
	tokens = {
		keywords = {
			_CONSTANT = {"const"        },
			_LOCAL    = {"local"        },
			_DEFINE   = {"define"       },
			_FUNCTION = {"function", "ƒ"},
		},
		types = {
			_NUMBER     = {"num",          "number"  },
			_INTEGER    = {"int",          "integer" },
			_DECIMAL    = {"flo", "float", "decimal" },
			_STRING     = {"str",          "string"  },
			_FUNCTION   = {"fun", "func" , "function"},
			_BOOLEAN    = {"boo", "bool" , "boolean" },
			_NULL       = {"nil", "nul"  , "null"    },
			_OBJECT     = {"obj", "map"  , "object"  },
			_ARRAY      = {"arr",          "array"   },
		},
		identifier = {"_?%a?%w+"}
	}
};

function M:escapeString (str)
  return str:gsub("[%(%)%.%%%+%-%*%?%[%]%^%$]", "%%%0");
end 

function M:getTokens (str)
	local tokens = {};
	--Get all tokens except for the last token (terminated with a semicolon)
	for token in string.gmatch(str, "(.-)[ ;]") do
		local tokenType = "_UNTYPED";
		for _, __ in pairs(M.tokens) do
			for typeName, patterns in pairs(__) do
				if type(patterns) == "table" then
					for i, pattern in ipairs(patterns) do
						--
					end
				else
					tokenType = typeName;
				end
			end
		end
		table.insert(tokens, Token(tokenType, token));
	end
	table.insert(tokens, Token("_SEMICOLON", ";"));
	return tokens;
end

function M:getLexicalDocumentModel (str)
	str = M:escapeString(str:gsub("%c", ""));
	print(str.."\n----------\n");
  local currentScope = Scope();
	for line in str:gmatch(".-;") do
		line = line:gsub("%c", "");
		table.insert(currentScope.expressions, Expression(line, self:getTokens(line)));
	end
  return currentScope;
end

function printTable (tbl, indent)
  if not indent then indent = 0 end
  for k, v in pairs(tbl) do
    formatting = string.rep("  ", indent) .. k .. ":\t";
    if type(v) == "table" then
      print(formatting);
      printTable(v, indent+1);
    else
      print(formatting.."\""..tostring(v).."\"");
    end
  end
end

local lexicalDocumentModel = M:getLexicalDocumentModel(testString);
printTable(lexicalDocumentModel);