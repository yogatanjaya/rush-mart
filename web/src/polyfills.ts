// Browser polyfills for the NEAR SDKs.
// This module must be the FIRST import in main.tsx: static imports are
// evaluated in order, so its side effects run before React/NEAR modules load.
// Vite's `define` cannot fix bare `process` references inside dependencies,
// so we install a real shim on globalThis instead.

import { Buffer } from "buffer";

declare global {
  interface Window {
    Buffer: typeof Buffer;
    global: typeof globalThis;
    process: any;
  }
}

const g: any = globalThis;

g.Buffer = g.Buffer ?? Buffer;
g.global = g.global ?? globalThis;

// NOTE: leave `versions` EMPTY. Libraries like js-sha256 detect Node by
// checking process.versions.node and then call require('crypto'), which does
// not exist in the browser. An empty versions object keeps them on the
// pure-JS/browser code path.
g.process = g.process ?? {
  env: {},
  browser: true,
  version: "v20.0.0",
  versions: {},
  platform: "browser",
  argv: [],
  cwd: () => "/",
  nextTick: (fn: (...args: any[]) => void, ...args: any[]) =>
    Promise.resolve().then(() => fn(...args)),
  emitWarning: (msg: any) => console.warn(msg),
  on: () => g.process,
  off: () => g.process,
  once: () => g.process,
  removeListener: () => g.process,
  removeAllListeners: () => g.process,
};

// Some bundles read process.env.NODE_ENV directly during module init.
if (g.process.env && typeof g.process.env.NODE_ENV === "undefined") {
  g.process.env.NODE_ENV = "production";
}

export {};
