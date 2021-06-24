import { readFileSync } from "node:fs";

const read = (path: string) => () => readFileSync(path, { encoding: "utf-8" });

export default read;