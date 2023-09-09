import { readFile, readdir } from "node:fs/promises";
import { Worker } from "node:worker_threads";
import {
  ansi,
  getCursorPos,
  pluralise,
} from "../core/util.js";

// NOTE: This keeps the event loop alive.
// Nodejs doesn't wait for "empty" promises
// https://github.com/nodejs/node/issues/22088
const timeout = setTimeout(() => {
  throw "Why did this not terminate in 24 days?";
}, 2147483647);

const files = (
  await readdir("dist/test", {
    recursive: true,
  })
).filter(
  file =>
    !file.endsWith(".map") &&
    !import.meta.url.endsWith(file)
);

type Result = Success | Failure;

type Success = Readonly<{
  type: "success";
  description: string;
}>;

type Failure = Readonly<{
  type: "failure";
  description: string;
  error: string;
}>;

const exit = (ok: boolean) => {
  if (ok) {
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
  // NOTE: Clearing the "busywork" to tell node it can stop the process
  clearTimeout(timeout);
};

const loadingChars = ["⠋", "⠙", "⠸", "⠴", "⠦", "⠇"];
const { version } = JSON.parse(
  await readFile("package.json", "utf-8")
);
const [, startY] = await getCursorPos();
console.log(`Running Odd v${version} test suite`);
let total = 0;
let done = 0;
const failures: Record<string, Failure[]> = {};
for (let line = 0; line < files.length; line++) {
  const file = files[line]!;
  const worker = new Worker("./dist/test/" + file, {
    stdout: true,
    stderr: true,
  });
  let loadingCharIndex = 0;
  let totalFile = 0;
  let doneFile = 0;
  let didFail = false;
  const interval = setInterval(() => {
    process.stdout.cursorTo(0, startY + line + 1);
    process.stdout.write(
      loadingChars[
        loadingCharIndex++ % loadingChars.length
      ] +
        " " +
        file
    );
  }, 100);
  let before: number;
  worker.on(
    "message",
    (payload: "register" | Result) => {
      if (payload === "register") {
        total += 1;
        totalFile += 1;
        before = performance.now();
      } else {
        done += 1;
        doneFile += 1;

        if (payload.type === "failure") {
          didFail = true;
          (failures[file] ??= []).push(payload);
        }

        if (doneFile === totalFile) {
          clearInterval(interval);
          process.stdout.cursorTo(
            0,
            startY + line + 1
          );
          process.stdout.clearLine(1);
          console.log(
            `${didFail ? "❌" : "✅"} ` +
              file +
              ansi.grey(
                ` (${Math.floor(
                  performance.now() - before
                )}ms)`
              )
          );

          if (done === total) {
            process.stdout.cursorTo(
              0,
              startY + files.length + 2
            );
            const ok =
              Object.keys(failures).length === 0;
            if (!ok) {
              console.log(
                `Found ${pluralise(
                  "issue",
                  Object.values(failures).flat().length
                )} in ${pluralise(
                  "file",
                  Object.keys(failures).length
                )}:\n`
              );
            } else {
              console.log(
                `${ansi.bold(
                  ansi.green("Done!")
                )} No issues found 😎`
              );
            }
            for (const [
              file,
              issues,
            ] of Object.entries(failures)) {
              for (const issue of issues) {
                console.log(
                  ansi.bold(`[${file}]`) +
                    ` ${issue.description}\n` +
                    `${issue.error}\n`
                );
              }
            }
            exit(ok);
          }
        }
      }
    }
  );
}
