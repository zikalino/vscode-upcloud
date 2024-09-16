const { build } = require("esbuild");
const { yamlPlugin } = require("esbuild-plugin-yaml");

const baseConfig = {
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  sourcemap: process.env.NODE_ENV !== "production",
  plugins: [ yamlPlugin() ]
};

const extensionConfig = {
  ...baseConfig,
  platform: "node",
  mainFields: ["module", "main"],
  format: "cjs",
  entryPoints: ["./src/extension.ts"],
  outfile: "./out/extension.js",
  external: ["vscode"],
  loader: {".html": "text"}
};


//const webviewConfig = {
//  ...baseConfig,
//  target: "es2020",
//  format: "esm",
//  bundle: true,
//  entryPoints: ["./src/vscode-helper-toolkit/src/webview/main.ts"],
//  outfile: "./out/webview.js",
//  loader: {".html": "text"}
//};

(async () => {
  const args = process.argv.slice(2);
  try {
    if (args.includes("--watch")) {
      // Build and watch extension and webview code
      console.log("[watch] build started");
      await build({
        ...extensionConfig,
        ...watchConfig,
      });
      await build({
        ...webviewConfig,
        ...watchConfig,
      });
      console.log("[watch] build finished");
    } else {
      // Build extension and webview code
      await build(extensionConfig);
      // await build(webviewConfig);
      console.log("build complete");
    }
  } catch (err) {
    process.stderr.write(err.stderr);
    process.exit(1);
  }
})();