local toBeCompiled = [[
	const a = 13;
	local b = 12;
	function a () {
		return "peter";
	}
]];

local function Scope ()
	return {
		constants = {},
		locals = {},
		functions = {},
		expressions = {},
		scopes = {}
	};
end

local function compile (str)
	--Clean str
	str = "\n"..str:gsub("%c", "").."\n";
	--Declare DOM to be a scope.
	local dom = Scope();
	--Find all expressions, and save them.
	for expression in str:gmatch("\n([^%c;]+)\n") do
		dom.expressions:insert(expression);
	end
	return dom;
end

local dom = compile(toBeCompiled);
for k, v in pairs(dom) do
	print(k..":");
	for kk, vk in pairs(v) do
		print("  "..kk..": "..vk);
	end
end