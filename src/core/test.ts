import { type Message } from "../test/run.js";

declare const self: Worker;

type TestOptions = Readonly<{
  timeout?: number;
}>;

const cancelSymbol = Symbol("cancelled");

const test = async (
  description: string,
  condition: () =>
    | string
    | void
    | Promise<string | void>,
  { timeout = 5000 }: TestOptions = {}
) => {
  self.postMessage({
    type: "register",
    description,
  } satisfies Message);

  let cancelled = false;
  let error: string | undefined | void;
  try {
    setTimeout(() => {
      throw cancelSymbol;
    }, timeout);
    error = await condition();
  } catch (err: any) {
    if (err !== cancelSymbol) {
      error = err.toString();
    } else {
      cancelled = true;
    }
  }

  self.postMessage(
    (cancelled
      ? {
          type: "timeout",
          description,
        }
      : error
      ? {
          type: "failure",
          description,
          error,
        }
      : {
          type: "success",
          description,
        }) satisfies Message
  );
};

export default test;
