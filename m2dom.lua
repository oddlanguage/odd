--[[
	declare a function with "function" or "ƒ"
	datatypes:
	-short        | num    | int     | flo     | str    | fun      | boo      | nul  | obj    | arr
	-intermediate |        |         | float   |        | func     | bool     |      |        |    
	-verbose      | number | integer | decimal | string | function | boolean  | null | object | array
]]--

local toBeCompiled = [[
	const int: a = 13;
	local int: b = 12;
	function a (str: text) {
		local namen = ["Gert", "Harry", "Frank"];
		return `${text} namen[3]`;
	}
	local obj: gert = {
		gay: true;
	};
	local frank = (gert.gay) ? "Gerts vriendje" : "Eenzaam";
]];

local M = {};

function M:expressions (str)
	str = str:gsub("%c", "");
	local currentScope = {};
	local lexed = {};
	local blocks = {};

	--Save and splice all blocks to be parsed later
	for block in str:gmatch("%b{}") do
		table.insert(blocks, block);
		str = str:gsub(block:gsub("[%(%)%.%%%+%-%*%?%[%]%^%$]", "%%%0"), "###"..#blocks.."###;"):gsub(";+", ";");
	end

	--Save all expressions in current scope.
	for expression in str:gmatch("[_%w%p ]-;") do
		table.insert(currentScope, expression);
	end

	for i in ipairs(currentScope) do
		if currentScope[i] == currentScope[i]:gsub("###(%d-)###", "") then
			currentScope[i] = {
				value = currentScope[i],
				block = nil
			};
		else
			currentScope[i] = {
				value = currentScope[i]:gsub("###(%d-)###", ""),
				block = currentScope[i]:gsub("(.*)###(%d-)###", function (str, i) return blocks[tonumber(i)] end)
			};
		end
	end

	return currentScope;
end

local expressions = M:expressions(toBeCompiled);
for i, v in ipairs(expressions) do
	print("Value: "..v.value.."\nBlock: "..(v.block or "nil").."\n");
end