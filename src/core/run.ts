import { readFile, writeFile } from "node:fs/promises";
import {
  ReadableStream,
  WritableStream,
} from "node:stream/web";

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

  try {
    const { default: run } = await import(
      `./arch/${options.arch}.js`
    );
    const content = await run(input);
    if (output) {
      await writeFile(output, content);
    } else {
      process.stdout.write(content);
    }
  } catch (_) {
    throw `Unknown architecture "${options.arch}".`;
  }
} else {
  (await import("./repl.js")).default(
    new ReadableStream({
      start: async controller => {
        process.stdin.setEncoding("utf-8");
        process.stdin.setRawMode(true);
        for await (const chunk of process.stdin)
          controller.enqueue(chunk);
      },
    }),
    new WritableStream({
      write: chunk => {
        process.stdout.write(chunk);
      },
    }),
    new WritableStream({
      write: chunk => {
        process.stderr.write(chunk);
      },
    }),
    `Odd v${
      JSON.parse(
        await readFile("package.json", "utf-8")
      ).version
    } repl`
  );
}
