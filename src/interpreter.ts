import { readFile } from "node:fs/promises";
import odd from "./odd.js";
import { serialise } from "./utils.js";

const target = process.argv[2];

if (!target)
  throw new Error("Please specify a file to run.");

readFile(target, "utf-8").then(input =>
  console.log(serialise(odd(input)))
);
