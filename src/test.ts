const test = async (
  description: string,
  condition:
    | boolean
    | (() => boolean | Promise<boolean>)
) => {
  try {
    const ok = await (typeof condition === "function"
      ? condition()
      : condition);
    if (!ok) throw null;
    console.log(`✅ ${description}`);
  } catch (err) {
    console.log(`❌ ${description}`);
    if (err) console.log(err + "\n");
  }
};

export default test;
