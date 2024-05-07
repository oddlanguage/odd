import {
  ReadableStream,
  WritableStream,
} from "node:stream/web";
import { ansi } from "./util.js";

type PromiseOr<T> = T | Promise<T>;

type Options = Readonly<{
  input: ReadableStream;
  output: WritableStream;
  suggest?: (
    input: string,
    cursor: number
  ) => PromiseOr<ReadonlyArray<string> | undefined>;
  colorise?: (input: string) => PromiseOr<string>;
}>;

type Interface = Readonly<{
  write: (data: string) => Promise<void>;
  question: (query: string) => Promise<string>;
}>;

export const createInterface = ({
  input,
  output,
  suggest = (_, __) => [],
  colorise = x => x,
}: Options): Interface => {
  const writer = output.getWriter();
  const reader = input.getReader();
  const write = (data: string) => {
    return writer.write(data);
  };

  const history: Array<string> = [];
  let historyIndex = 0;
  let line = "";
  let cursor = 0;
  const question = async (query: string) => {
    await write(query);
    while (true) {
      const { value: chunk } = await reader.read();
      if (chunk === "\x1B\x5B\x41") {
        // up arrow
        historyIndex = Math.max(-1, historyIndex - 1);
        line = history[historyIndex] ?? "";
        cursor = line.length;
      } else if (chunk === "\x1B\x5B\x42") {
        // down arrow
        historyIndex = Math.min(
          history.length,
          historyIndex + 1
        );
        line = history[historyIndex] ?? "";
        cursor = line.length;
      } else if (chunk === "\x1B\x5B\x44") {
        // left arrow
        if (cursor > 0) {
          cursor -= 1;
        }
      } else if (chunk === "\x1B\x5B\x43") {
        // right arrow
        if (cursor < line.length) {
          cursor += 1;
        }
      } else if (chunk === "\x03") {
        // ctrl+c
        process.exit();
      } else if (chunk === "\x08") {
        // backspace
        if (cursor > 0) {
          line =
            line.slice(0, cursor - 1) +
            line.slice(cursor);
          cursor -= 1;
        } else {
          continue;
        }
      } else if (chunk === "\x0D") {
        // "carriage return (\r)"
        await write("\n");
        const value = line;
        historyIndex = history.push(line);
        line = "";
        cursor = 0;
        return value;
      } else if (chunk === "\x7F") {
        // "ctrl+backspace"
        const before = cursor;
        while (
          cursor > 0 &&
          !/\s/.test(line[cursor]!)
        ) {
          cursor -= 1;
        }
        while (
          cursor > 0 &&
          /\s/.test(line[cursor]!)
        ) {
          cursor -= 1;
        }
        line =
          line.slice(0, cursor) + line.slice(before);
      } else if (chunk === "\x1B[3~") {
        //  "delete"
        if (cursor < line.length) {
          line =
            line.slice(0, cursor) +
            line.slice(cursor + 1);
        } else {
          continue;
        }
      } else {
        line =
          line.slice(0, cursor) +
          ansi.clear(chunk) +
          line.slice(cursor);
        cursor += chunk.length;
      }
      const suggestions = await suggest(line, cursor);
      // TODO: This is to make the compiler shut up.
      // Remove when suggestions are implemented.
      suggestions;

      // TODO: Figure out how to move the cursor/clear line through
      // `reader` without directly referencing `stdout`
      const colorised = await colorise(line);
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      await write(query + colorised);
      process.stdout.cursorTo(
        cursor + ansi.clear(query).length
      );
      // TODO: Figure out where cursor mismatch bc of colors occurs
    }
  };
  return { write, question };
};
