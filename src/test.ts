const test = (
  description: string,
  condition: boolean | (() => boolean)
) => {
  try {
    const ok =
      typeof condition === "function"
        ? condition()
        : condition;
    if (!ok) throw null;
    console.log(`✅ ${description}`);
  } catch (err) {
    console.log(`❌ ${description}`);
    if (err) console.log(err + "\n");
  }
};

export default test;
