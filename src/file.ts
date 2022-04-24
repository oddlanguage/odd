import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type File = Readonly<{
	path: string;
	contents: string;
}>;

export const read = (
	path: string,
	encoding: BufferEncoding = "utf-8"
): Promise<File> =>
	readFile(path, { encoding }).then(contents => ({
		path: join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			path
		),
		contents
	}));

export const write = (
	path: string,
	contents: string
): Promise<void> => writeFile(path, contents);
