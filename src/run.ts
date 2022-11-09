import fs from "node:fs/promises";
import parse from "./odd.js";
import stringify from "./stringify.js";
import { serialise } from "./util.js";

const target = process.argv[2];
const outfile = process.argv[3];

const compile = (target: string) =>
  fs
    .readFile(target, "utf-8")
    .then(input => {
      const output = stringify(parse(input));
      if (outfile)
        return fs.writeFile(outfile, output);
      console.log(serialise(output));
    })
    .catch(err => {
      console.error("\n" + serialise(err) + "\n");
      process.exit(1);
    });

const repl = async () => {
  process.stdout.write(`Odd repl 0.1\n> `);
  process.stdin.setEncoding("utf-8");
  for await (const input of process.stdin) {
    try {
      const compiled = stringify(
        parse(input.trimEnd())
      );
      console.log(
        compiled,
        "\n" + "-".repeat(compiled.length)
      );
      process.stdout.write(serialise(eval(compiled)));
    } catch (err) {
      console.error("\n" + serialise(err));
    }
    process.stdout.write("\n> ");
  }
};

if (target) {
  await compile(target);
} else {
  await repl();
}
