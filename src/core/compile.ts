import { Tree } from "./parser.js";

const enum WASMSection {
  Custom = 0x00,
  Type = 0x01,
  Import = 0x02,
  Function = 0x03,
  Table = 0x04,
  Memory = 0x05,
  Global = 0x06,
  Export = 0x07,
  Start = 0x08,
  Element = 0x08,
  Code = 0x0a,
  Data = 0x0b,
  DataCount = 0x0c
}

const enum WASMType {
  Fun = 0x60,
  ExternRef = 0x6f,
  FunRef = 0x70,
  Vec128 = 0x7b,
  I32 = 0x7f,
  I64 = 0x7e,
  F32 = 0x7d,
  F64 = 0x7c
}

const str2bin = (str: string) =>
  [...str].map(c => c.charCodeAt(0));

const compile = (
  tree: Tree
): ReadonlyArray<number> => {
  switch (tree.type) {
    case "program": {
      // https://webassembly.github.io/spec/core/binary/modules.html
      const wasmMagic = str2bin("\0asm");
      const wasmVersion = [1, 0, 0, 0];
      const typeSection = [
        WASMSection.Type /*, size */ /*, count */
      ];
      const funSection = [
        WASMSection.Function /*, size */ /*, count */
      ];
      const exportSection = [
        WASMSection.Export /*, size */ /*, count */
      ];
      const codeSection = [
        WASMSection.Code /*, size */ /*, count */
      ];

      // TODO: remove this when implementing :)
      WASMType.Fun;

      return wasmMagic
        .concat(wasmVersion)
        .concat(typeSection)
        .concat(funSection)
        .concat(exportSection)
        .concat(codeSection);
    }
    default:
      throw `Unhandled node type "${tree.type}".`;
  }
};

export default compile;
