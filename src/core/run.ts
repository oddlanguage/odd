import { writeFile } from "fs/promises";

const args = process.argv.slice(2);

const options = args
  .filter(arg => arg.startsWith("-"))
  .map(arg => arg.slice(arg.lastIndexOf("-") + 1))
  .reduce((acc, arg) => {
    const [name, value = true] = arg.split("=");
    return { ...acc, [name!]: value };
  }, {} as Record<string, any>);

const [input, output] = args.filter(
  arg => !arg.startsWith("-")
);

if (input) {
  switch (options.arch) {
    case undefined:
      throw "Missing architecture.";
    case "ts": {
      const { default: run } = await import(
        "./arch/typescript.js"
      );
      const content = await run(input);
      if (output) {
        await writeFile(output, content);
      } else {
        process.stdout.write(content);
      }
      break;
    }
    default:
      throw `Unknown arhcitecture "${options.arch}".`;
  }
} else {
  (await import("./repl.js")).default();
}
