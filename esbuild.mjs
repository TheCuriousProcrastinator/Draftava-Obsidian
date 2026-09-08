import esbuild from "esbuild";
import { builtinModules } from "node:module";

const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map(
    (name) => `node:${name}`
  )
];

await esbuild.build({
  entryPoints: [
    "src/main.ts"
  ],

  bundle: true,

  /*
   Obsidian supplies these at runtime.
   Node built-ins are also provided by the
   desktop Electron environment and must not
   be bundled as browser packages.
  */
  external: [
    "obsidian",
    "electron",
    ...nodeBuiltins
  ],

  format: "cjs",
  platform: "browser",
  target: "es2022",
  logLevel: "info",
  sourcemap: "inline",
  treeShaking: true,
  outfile: "main.js"
});
