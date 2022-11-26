const test = async (
  description: string,
  condition: () => boolean | Promise<boolean>
) => {
  try {
    const ok = await condition();
    if (!ok) throw null;
    console.log(`✅ ${description}`);
  } catch (err: any) {
    console.log(`❌ ${description}`);
    if (err) console.log(err.stack ?? err + "\n");
  }
};

export default test;
