import fs from "node:fs/promises";
import parse from "odd/parser.js";
import { serialise } from "util.js";

const compile = (target: string) =>
  fs
    .readFile(target, "utf-8")
    .then(input =>
      console.log(
        serialise(
          parse({ input: input, name: target })
        )
      )
    )
    .catch(err => {
      console.error("\n" + serialise(err) + "\n");
      process.exit(1);
    });

export default compile;
