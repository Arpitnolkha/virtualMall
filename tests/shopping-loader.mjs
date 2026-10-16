import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";
import ts from "typescript";
const nativeRequire = createRequire(import.meta.url);
const root = process.cwd();
export function loader(overrides = {}, env = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!path.extname(file)) {
      file += fs.existsSync(file + ".ts") ? ".ts" : ".tsx";
    }
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const require = (name) => {
      if (name in overrides) return overrides[name];
      if (name === "server-only") return {};
      if (name.startsWith("@/")) return load(name.slice(2));
      if (name.startsWith("."))
        return load(path.resolve(path.dirname(file), name));
      return nativeRequire(name);
    };
    vm.runInNewContext(code, {
      Error,
      exports,
      require,
      process: { env },
      console,
      Buffer,
      TextDecoder,
      TextEncoder,
      performance,
      crypto: webcrypto,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      fetch,
      Response,
      Request,
      URL,
      atob,
      ...globals,
    });
    return exports;
  }
  return load;
}
