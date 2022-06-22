import odd from "./odd.js";
import { serialise } from "./parser.js";

process.stdout.write(`Odd repl 0.1\n> `);
process.stdin.setEncoding("utf-8");
for await (const input of process.stdin) {
  process.stdout.write(serialise(odd(input)));
  process.stdout.write("\n> ");
}
