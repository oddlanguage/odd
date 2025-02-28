import { readFile, readdir } from "node:fs/promises";
import Path from "node:path";
import NodeURL from "node:url";
import { ansi, partition } from "../core/util.js";

export type Message = Register | Result;

type Result = Success | Failure | Timeout;

type Register = Readonly<{
  type: "register";
  description: string;
}>;

type Success = Readonly<{
  type: "success";
  description: string;
}>;

type Timeout = Readonly<{
  type: "timeout";
  description: string;
}>;

type Failure = Readonly<{
  type: "failure";
  description: string;
  error: string;
}>;

type ResultWithPath = Result & { path: string };

const CWD = Path.dirname(
  NodeURL.fileURLToPath(import.meta.url)
);

const files = (
  await readdir(CWD, { recursive: true })
).filter(
  file =>
    !file.endsWith(".map") &&
    !import.meta.url.endsWith(file)
);

const loadingChars = ["⠋", "⠙", "⠸", "⠴", "⠦", "⠇"];
const { version } = JSON.parse(
  await readFile("package.json", "utf-8")
);
console.log(`\nRunning Odd v${version} test suite\n`);

let done = 0;
let total = 0;

let i = 0;
const ticker = setInterval(() => {
  const char =
    loadingChars[(i = (i + 1) % loadingChars.length)]!;
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(
    ansi.bold(
      ansi.bg.lightGrey(
        ansi.black(
          ` ${char} PROCESSING ${done}/${total} `
        )
      )
    )
  );
}, 100);

const results = (
  await Promise.all(
    files.map(file => {
      const { promise, resolve } =
        Promise.withResolvers<ResultWithPath[]>();
      const path = Path.resolve(CWD, file);
      const worker = new Worker(path);
      const messages: ResultWithPath[] = [];
      let totalInThisFile = 0;
      worker.addEventListener(
        "message",
        ({
          data: message,
        }: Bun.MessageEvent<Message>) => {
          switch (message.type) {
            case "register": {
              total += 1;
              totalInThisFile += 1;
              break;
            }
            case "success":
            case "failure":
            case "timeout": {
              done += 1;
              messages.push({ ...message, path });
              if (
                messages.length === totalInThisFile
              ) {
                worker.terminate();
                resolve(messages);
              }
              break;
            }
          }
        }
      );
      return promise;
    })
  )
).flat();

const [passed, failed] = partition(
  ({ type }: ResultWithPath) => type === "success"
)(results);
clearInterval(ticker);
process.stdout.clearLine(0);
process.stdout.cursorTo(0);
const maxChars = Math.max(
  passed.length,
  failed.length
).toString().length;
console.log(
  ansi.green(
    ` ✓ ${passed.length
      .toString()
      .padStart(maxChars, " ")} PASSED\n`
  ) +
    ansi[failed.length ? "red" : "black"](
      ` ⨯ ${failed.length
        .toString()
        .padStart(maxChars, " ")} FAILED\n\n`
    ) +
    (failed.length
      ? failed
          .map(
            f =>
              ansi.bg.lightGrey(
                ansi.grey(` ${Path.basename(f.path)} `)
              ) +
              " " +
              ansi.bold(
                ansi.red("⨯ " + f.description)
              ) +
              "\n" +
              (
                (f as Failure).error ??
                ansi.yellow(" ▲ Timed out ")
              )
                .split("\n")
                .map(line => "  " + line)
                .join("\n")
          )
          .join("\n\n")
      : "No issues found! 😎") +
    "\n"
);

if (failed.length) {
  process.exit(1);
}
