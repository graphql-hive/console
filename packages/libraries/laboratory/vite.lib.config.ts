import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import monacoEditor from "vite-plugin-monaco-editor";
import dts from "unplugin-dts/vite";

const externals = [
  "@tanstack/react-form",
  "date-fns",
  "graphql-ws",
  "lucide-react",
  "lz-string",
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "tslib",
  "zod",
];

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // @ts-expect-error temporary package typing mismatch
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
      include: ["src/index.ts", "src/lib/**/*.ts", "src/components/**/*.tsx"],
      exclude: ["src/main.tsx"],
      insertTypesEntry: true,
      staticImport: true,
      outDir: "dist",
      tsconfigPath: "./tsconfig.app.json",
      skipDiagnostics: true,
      logDiagnostics: false,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    copyPublicDir: false,
    cssCodeSplit: false,
    commonjsOptions: {
      esmExternals: true,
    },
    lib: {
      entry: path.resolve(__dirname, "./src/index.ts"),
      name: "HiveLaboratory",
      formats: ["es", "cjs"],
      fileName: (format) => `hive-laboratory.${format}.js`,
    },
    rollupOptions: {
      external: externals,
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
