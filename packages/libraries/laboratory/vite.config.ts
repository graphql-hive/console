import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import monacoEditor from "vite-plugin-monaco-editor";

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
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
