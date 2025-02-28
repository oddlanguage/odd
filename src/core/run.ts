import { writeFile } from "node:fs/promises";
import { version } from "../../package.json";

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
  if (!options.arch) {
    throw "Missing architecture.";
  }

  if (/[^a-z0-9\-]/i.test(options.arch)) {
    throw "Architecture names can only contain alphanumerical characters and hyphens.";
  }

  let run: (input: string) => Promise<string>;
  try {
    run = (await import(`./arch/${options.arch}.js`))
      .default;
  } catch (_) {
    throw `Unknown architecture "${options.arch}".`;
  }
  const content = await run(input);
  if (output) {
    await writeFile(output, content);
  } else {
    process.stdout.write(content);
  }
} else {
  (await import("./repl.js")).default(
    `Odd v${version} repl`
  );
}
