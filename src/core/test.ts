import { parentPort as self } from "node:worker_threads";

const test = async (
  description: string,
  condition: () =>
    | string
    | void
    | Promise<string | void>
) => {
  self?.postMessage("register");

  let error: string | void;
  try {
    error = await condition();
  } catch (err: any) {
    error = err.toString();
  }
  self?.postMessage({
    type: error ? "failure" : "success",
    description,
    error,
  });
};

export default test;
