import { readFile } from "node:fs/promises";
import odd from "./odd.js";
import { serialise } from "./utils.js";

const target = process.argv[2];

if (!target)
  throw new Error("Please specify a file to run.");

const input = await readFile(target, "utf-8");

try {
  console.log(serialise(odd(input)));
} catch (err) {
  console.error(err);
  process.exit(1);
}
