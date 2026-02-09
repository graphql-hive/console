import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import monacoEditor from "vite-plugin-monaco-editor";
import dts from "unplugin-dts/vite";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const enableReactCompiler = command === "serve";

  return {
    plugins: [
      react({
        babel: {
          plugins: enableReactCompiler ? ["babel-plugin-react-compiler"] : [],
        },
      }),
      tailwindcss(),
      // @ts-expect-error temp
      monacoEditor.default({
        languageWorkers: ["json", "typescript", "editorWorkerService"],
        customWorkers: [
          {
            label: "graphql",
            entry: "monaco-graphql/dist/graphql.worker",
          },
        ],
      }),
      dts({
        insertTypesEntry: true,
        staticImport: true,
        include: ["src/**/*.ts", "src/**/*.tsx"],
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      copyPublicDir: false,
      lib: {
        entry: path.resolve(__dirname, "./src/index.ts"),
        name: "HiveLaboratory",
        formats: ["es", "cjs"],
        fileName: (format) => `hive-laboratory.${format}.js`,
      },
    },
  };
});
