import { inspect, InspectOptions } from "node:util";

inspect.styles = {
	string: "yellow",
	number: "magenta",
	bigint: "magenta",
	boolean: "magenta",
	symbol: "blue",
	undefined: "magenta",
	special: "blue",
	null: "magenta",
	date: "underline",
	regexp: "yellow",
	module: "underline"
};

export const range = (n: number) =>
	Array.from(Array(n).keys());

export const constant = <T>(x: T) => () => x;

export const prefixIndefiniteArticle = (thing?: string) =>
	thing && `${/^[aeuioy]/.test(thing) ? "an" : "a"} ${thing}`;

type PrintOptions = Partial<Readonly<{
	max: InspectOptions["maxArrayLength"];
	depth: InspectOptions["depth"];
	compact: InspectOptions["compact"];
}>>;
export const print = <T>(x: T, options?: PrintOptions) => {
	console.log((typeof x === "string")
		? x
		: inspect(x, {
			colors: true,
			depth: options?.depth ?? Infinity,
			maxArrayLength: options?.max ?? Infinity,
			compact: options?.compact }));

	return x;
};

export const pipe = (...fs: ((...args: any[]) => any)[]) => (x: any) =>
	fs.reduce((y, f) => f(y), x);

export const first = <T>(array: T[]): T | undefined =>
	array[0];

export const kebabToCamel = (identifier: string) =>
	identifier.replace(/-\w/g, ([_, x]) => x.toUpperCase());

export const capitalise = (x: string) =>
	String.fromCodePoint(x.codePointAt(0)!).toLocaleUpperCase() + x.slice(1);