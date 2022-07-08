import parser from "./odd.js";
import { serialise } from "./utils.js";

export default async () => {
  process.stdout.write(`Odd repl 0.1\n> `);
  process.stdin.setEncoding("utf-8");
  for await (const input of process.stdin) {
    try {
      process.stdout.write(serialise(parser(input)));
    } catch (err) {
      console.error("\n" + err);
    }
    process.stdout.write("\n> ");
  }
};
