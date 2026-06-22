// ../../../../configs/tsup/dev.config.node.ts
import { parseArgs } from "node:util";
import { defineConfig } from "tsup";

// ../../../../configs/tsup/utils.ts
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { getPackagesSync } from "@manypkg/get-packages";
var __injected_dirname__ = "C:\\Users\\College\\Desktop\\console\\configs\\tsup";
var rootDir = resolve(__injected_dirname__, "../../");
var libDir = process.cwd();
var packagesMetadata = getPackagesSync(rootDir);
var currentPackage = packagesMetadata.packages.find((p) => p.dir === libDir);
var commonWatchList = () => {
  return [
    libDir + "/src/**/*",
    libDir + "/.env",
    libDir + "/tsconfig.json",
    rootDir + "/tsconfig.json",
    rootDir + "/tsup.config.*"
  ];
};
var monorepoWatchList = () => {
  if (!currentPackage) {
    return [];
  }
  const internalDeps = Object.entries({
    ...currentPackage.packageJson.dependencies || {},
    ...currentPackage.packageJson.devDependencies || {},
    ...currentPackage.packageJson.peerDependencies || {}
  }).reduce((prev, [name, version]) => {
    if (version === "workspace:*") {
      return [...prev, name];
    }
    return prev;
  }, []);
  return internalDeps.reduce((prev, dep) => {
    const found = packagesMetadata.packages.find((p) => p.packageJson.name === dep);
    if (!found) {
      return prev;
    }
    return [...prev, join(found.dir, "/src/**/*")];
  }, []);
};
var nodeVersion = readFileSync(join(rootDir, "/.node-version")).toString();
var targetFromNodeVersion = () => {
  const clean = nodeVersion.trim().split(".");
  return `node${clean[0]}`;
};
var watchEntryPlugin = () => {
  return {
    name: "node-watch-entry",
    esbuildOptions(options) {
      const entries = options.entryPoints || [];
      const entry = entries.find((entry2) => entry2 === "src/dev.ts" || entry2 === "test/root.ts");
      if (!entry) {
        throw new Error("No entry point found");
      }
      const outFile = entry.replace("src/", "dist/").replace("test/", "dist/").replace(".ts", ".js");
      const inspectFlag = process.env.INSPECT ? "--inspect " : " ";
      const nodeOptions = process.env.NODE_OPTIONS || "";
      this.options.onSuccess = `node --enable-source-maps ${inspectFlag} ${nodeOptions} ${outFile} | pino-pretty --translateTime HH:MM:ss TT --ignore pid,hostname`;
    }
  };
};

// ../../../../configs/tsup/dev.config.node.ts
var entryPoints = parseArgs({
  allowPositionals: true,
  strict: false
}).positionals;
var dev_config_node_default = defineConfig({
  entryPoints: entryPoints.length ? entryPoints : ["src/index.ts"],
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  format: "esm",
  watch: process.env.WATCH === "0" ? false : [...commonWatchList(), ...monorepoWatchList()],
  target: targetFromNodeVersion(),
  plugins: [watchEntryPlugin()]
});
export {
  dev_config_node_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vY29uZmlncy90c3VwL2Rldi5jb25maWcubm9kZS50cyIsICIuLi8uLi8uLi8uLi9jb25maWdzL3RzdXAvdXRpbHMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiQzpcXFxcVXNlcnNcXFxcQ29sbGVnZVxcXFxEZXNrdG9wXFxcXGNvbnNvbGVcXFxcY29uZmlnc1xcXFx0c3VwXFxcXGRldi5jb25maWcubm9kZS50c1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCJDOlxcXFxVc2Vyc1xcXFxDb2xsZWdlXFxcXERlc2t0b3BcXFxcY29uc29sZVxcXFxjb25maWdzXFxcXHRzdXBcIjtjb25zdCBfX2luamVjdGVkX2ltcG9ydF9tZXRhX3VybF9fID0gXCJmaWxlOi8vL0M6L1VzZXJzL0NvbGxlZ2UvRGVza3RvcC9jb25zb2xlL2NvbmZpZ3MvdHN1cC9kZXYuY29uZmlnLm5vZGUudHNcIjtpbXBvcnQgeyBwYXJzZUFyZ3MgfSBmcm9tICdub2RlOnV0aWwnO1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd0c3VwJztcclxuaW1wb3J0IHtcclxuICBjb21tb25XYXRjaExpc3QsXHJcbiAgbW9ub3JlcG9XYXRjaExpc3QsXHJcbiAgdGFyZ2V0RnJvbU5vZGVWZXJzaW9uLFxyXG4gIHdhdGNoRW50cnlQbHVnaW4sXHJcbn0gZnJvbSAnLi91dGlscyc7XHJcblxyXG5jb25zdCBlbnRyeVBvaW50cyA9IHBhcnNlQXJncyh7XHJcbiAgYWxsb3dQb3NpdGlvbmFsczogdHJ1ZSxcclxuICBzdHJpY3Q6IGZhbHNlLFxyXG59KS5wb3NpdGlvbmFscztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgZW50cnlQb2ludHM6IGVudHJ5UG9pbnRzLmxlbmd0aCA/IGVudHJ5UG9pbnRzIDogWydzcmMvaW5kZXgudHMnXSxcclxuICBzcGxpdHRpbmc6IGZhbHNlLFxyXG4gIHNvdXJjZW1hcDogdHJ1ZSxcclxuICBjbGVhbjogdHJ1ZSxcclxuICBzaGltczogdHJ1ZSxcclxuICBmb3JtYXQ6ICdlc20nLFxyXG4gIHdhdGNoOiBwcm9jZXNzLmVudi5XQVRDSCA9PT0gJzAnID8gZmFsc2UgOiBbLi4uY29tbW9uV2F0Y2hMaXN0KCksIC4uLm1vbm9yZXBvV2F0Y2hMaXN0KCldLFxyXG4gIHRhcmdldDogdGFyZ2V0RnJvbU5vZGVWZXJzaW9uKCksXHJcbiAgcGx1Z2luczogW3dhdGNoRW50cnlQbHVnaW4oKV0sXHJcbn0pO1xyXG4iLCAiY29uc3QgX19pbmplY3RlZF9maWxlbmFtZV9fID0gXCJDOlxcXFxVc2Vyc1xcXFxDb2xsZWdlXFxcXERlc2t0b3BcXFxcY29uc29sZVxcXFxjb25maWdzXFxcXHRzdXBcXFxcdXRpbHMudHNcIjtjb25zdCBfX2luamVjdGVkX2Rpcm5hbWVfXyA9IFwiQzpcXFxcVXNlcnNcXFxcQ29sbGVnZVxcXFxEZXNrdG9wXFxcXGNvbnNvbGVcXFxcY29uZmlnc1xcXFx0c3VwXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9DOi9Vc2Vycy9Db2xsZWdlL0Rlc2t0b3AvY29uc29sZS9jb25maWdzL3RzdXAvdXRpbHMudHNcIjtpbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XHJcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgZ2V0UGFja2FnZXNTeW5jIH0gZnJvbSAnQG1hbnlwa2cvZ2V0LXBhY2thZ2VzJztcclxuXHJcbmNvbnN0IHJvb3REaXIgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLycpO1xyXG5jb25zdCBsaWJEaXIgPSBwcm9jZXNzLmN3ZCgpO1xyXG5jb25zdCBwYWNrYWdlc01ldGFkYXRhID0gZ2V0UGFja2FnZXNTeW5jKHJvb3REaXIpO1xyXG5jb25zdCBjdXJyZW50UGFja2FnZSA9IHBhY2thZ2VzTWV0YWRhdGEucGFja2FnZXMuZmluZChwID0+IHAuZGlyID09PSBsaWJEaXIpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGNvbW1vbldhdGNoTGlzdCA9ICgpID0+IHtcclxuICByZXR1cm4gW1xyXG4gICAgbGliRGlyICsgJy9zcmMvKiovKicsXHJcbiAgICBsaWJEaXIgKyAnLy5lbnYnLFxyXG4gICAgbGliRGlyICsgJy90c2NvbmZpZy5qc29uJyxcclxuICAgIHJvb3REaXIgKyAnL3RzY29uZmlnLmpzb24nLFxyXG4gICAgcm9vdERpciArICcvdHN1cC5jb25maWcuKicsXHJcbiAgXTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBtb25vcmVwb1dhdGNoTGlzdCA9ICgpID0+IHtcclxuICBpZiAoIWN1cnJlbnRQYWNrYWdlKSB7XHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG5cclxuICBjb25zdCBpbnRlcm5hbERlcHMgPSBPYmplY3QuZW50cmllcyh7XHJcbiAgICAuLi4oY3VycmVudFBhY2thZ2UucGFja2FnZUpzb24uZGVwZW5kZW5jaWVzIHx8IHt9KSxcclxuICAgIC4uLihjdXJyZW50UGFja2FnZS5wYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pLFxyXG4gICAgLi4uKGN1cnJlbnRQYWNrYWdlLnBhY2thZ2VKc29uLnBlZXJEZXBlbmRlbmNpZXMgfHwge30pLFxyXG4gIH0pLnJlZHVjZSgocHJldiwgW25hbWUsIHZlcnNpb25dKSA9PiB7XHJcbiAgICBpZiAodmVyc2lvbiA9PT0gJ3dvcmtzcGFjZToqJykge1xyXG4gICAgICByZXR1cm4gWy4uLnByZXYsIG5hbWVdO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwcmV2O1xyXG4gIH0sIFtdIGFzIHN0cmluZ1tdKTtcclxuXHJcbiAgcmV0dXJuIGludGVybmFsRGVwcy5yZWR1Y2UoKHByZXYsIGRlcCkgPT4ge1xyXG4gICAgY29uc3QgZm91bmQgPSBwYWNrYWdlc01ldGFkYXRhLnBhY2thZ2VzLmZpbmQocCA9PiBwLnBhY2thZ2VKc29uLm5hbWUgPT09IGRlcCk7XHJcblxyXG4gICAgaWYgKCFmb3VuZCkge1xyXG4gICAgICByZXR1cm4gcHJldjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gWy4uLnByZXYsIGpvaW4oZm91bmQuZGlyLCAnL3NyYy8qKi8qJyldO1xyXG4gIH0sIFtdIGFzIHN0cmluZ1tdKTtcclxufTtcclxuXHJcbmNvbnN0IG5vZGVWZXJzaW9uID0gcmVhZEZpbGVTeW5jKGpvaW4ocm9vdERpciwgJy8ubm9kZS12ZXJzaW9uJykpLnRvU3RyaW5nKCk7XHJcblxyXG5leHBvcnQgY29uc3QgdGFyZ2V0RnJvbU5vZGVWZXJzaW9uID0gKCkgPT4ge1xyXG4gIGNvbnN0IGNsZWFuID0gbm9kZVZlcnNpb24udHJpbSgpLnNwbGl0KCcuJyk7XHJcblxyXG4gIHJldHVybiBgbm9kZSR7Y2xlYW5bMF19YCBhcyBhbnk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgd2F0Y2hFbnRyeVBsdWdpbiA9ICgpID0+IHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ25vZGUtd2F0Y2gtZW50cnknLFxyXG4gICAgZXNidWlsZE9wdGlvbnMob3B0aW9ucykge1xyXG4gICAgICBjb25zdCBlbnRyaWVzID0gKG9wdGlvbnMuZW50cnlQb2ludHMgYXMgc3RyaW5nW10pIHx8IFtdO1xyXG4gICAgICBjb25zdCBlbnRyeSA9IGVudHJpZXMuZmluZChlbnRyeSA9PiBlbnRyeSA9PT0gJ3NyYy9kZXYudHMnIHx8IGVudHJ5ID09PSAndGVzdC9yb290LnRzJyk7XHJcblxyXG4gICAgICBpZiAoIWVudHJ5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBlbnRyeSBwb2ludCBmb3VuZCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBvdXRGaWxlID0gZW50cnlcclxuICAgICAgICAucmVwbGFjZSgnc3JjLycsICdkaXN0LycpXHJcbiAgICAgICAgLnJlcGxhY2UoJ3Rlc3QvJywgJ2Rpc3QvJylcclxuICAgICAgICAucmVwbGFjZSgnLnRzJywgJy5qcycpO1xyXG4gICAgICBjb25zdCBpbnNwZWN0RmxhZyA9IHByb2Nlc3MuZW52LklOU1BFQ1QgPyAnLS1pbnNwZWN0ICcgOiAnICc7XHJcbiAgICAgIGNvbnN0IG5vZGVPcHRpb25zID0gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TIHx8ICcnO1xyXG4gICAgICB0aGlzLm9wdGlvbnMub25TdWNjZXNzID0gYG5vZGUgLS1lbmFibGUtc291cmNlLW1hcHMgJHtpbnNwZWN0RmxhZ30gJHtub2RlT3B0aW9uc30gJHtvdXRGaWxlfSB8IHBpbm8tcHJldHR5IC0tdHJhbnNsYXRlVGltZSBISDpNTTpzcyBUVCAtLWlnbm9yZSBwaWQsaG9zdG5hbWVgO1xyXG4gICAgfSxcclxuICB9O1xyXG59O1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTJTLFNBQVMsaUJBQWlCO0FBQ3JVLFNBQVMsb0JBQW9COzs7QUNEMFAsU0FBUyxvQkFBb0I7QUFDcFQsU0FBUyxNQUFNLGVBQWU7QUFDOUIsU0FBUyx1QkFBdUI7QUFGOEQsSUFBTSx1QkFBdUI7QUFJM0gsSUFBTSxVQUFVLFFBQVEsc0JBQVcsUUFBUTtBQUMzQyxJQUFNLFNBQVMsUUFBUSxJQUFJO0FBQzNCLElBQU0sbUJBQW1CLGdCQUFnQixPQUFPO0FBQ2hELElBQU0saUJBQWlCLGlCQUFpQixTQUFTLEtBQUssT0FBSyxFQUFFLFFBQVEsTUFBTTtBQUVwRSxJQUFNLGtCQUFrQixNQUFNO0FBQ25DLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxJQUNULFNBQVM7QUFBQSxJQUNULFNBQVM7QUFBQSxJQUNULFVBQVU7QUFBQSxJQUNWLFVBQVU7QUFBQSxFQUNaO0FBQ0Y7QUFFTyxJQUFNLG9CQUFvQixNQUFNO0FBQ3JDLE1BQUksQ0FBQyxnQkFBZ0I7QUFDbkIsV0FBTyxDQUFDO0FBQUEsRUFDVjtBQUVBLFFBQU0sZUFBZSxPQUFPLFFBQVE7QUFBQSxJQUNsQyxHQUFJLGVBQWUsWUFBWSxnQkFBZ0IsQ0FBQztBQUFBLElBQ2hELEdBQUksZUFBZSxZQUFZLG1CQUFtQixDQUFDO0FBQUEsSUFDbkQsR0FBSSxlQUFlLFlBQVksb0JBQW9CLENBQUM7QUFBQSxFQUN0RCxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLE9BQU8sTUFBTTtBQUNuQyxRQUFJLFlBQVksZUFBZTtBQUM3QixhQUFPLENBQUMsR0FBRyxNQUFNLElBQUk7QUFBQSxJQUN2QjtBQUVBLFdBQU87QUFBQSxFQUNULEdBQUcsQ0FBQyxDQUFhO0FBRWpCLFNBQU8sYUFBYSxPQUFPLENBQUMsTUFBTSxRQUFRO0FBQ3hDLFVBQU0sUUFBUSxpQkFBaUIsU0FBUyxLQUFLLE9BQUssRUFBRSxZQUFZLFNBQVMsR0FBRztBQUU1RSxRQUFJLENBQUMsT0FBTztBQUNWLGFBQU87QUFBQSxJQUNUO0FBRUEsV0FBTyxDQUFDLEdBQUcsTUFBTSxLQUFLLE1BQU0sS0FBSyxXQUFXLENBQUM7QUFBQSxFQUMvQyxHQUFHLENBQUMsQ0FBYTtBQUNuQjtBQUVBLElBQU0sY0FBYyxhQUFhLEtBQUssU0FBUyxnQkFBZ0IsQ0FBQyxFQUFFLFNBQVM7QUFFcEUsSUFBTSx3QkFBd0IsTUFBTTtBQUN6QyxRQUFNLFFBQVEsWUFBWSxLQUFLLEVBQUUsTUFBTSxHQUFHO0FBRTFDLFNBQU8sT0FBTyxNQUFNLENBQUMsQ0FBQztBQUN4QjtBQUVPLElBQU0sbUJBQW1CLE1BQU07QUFDcEMsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sZUFBZSxTQUFTO0FBQ3RCLFlBQU0sVUFBVyxRQUFRLGVBQTRCLENBQUM7QUFDdEQsWUFBTSxRQUFRLFFBQVEsS0FBSyxDQUFBQSxXQUFTQSxXQUFVLGdCQUFnQkEsV0FBVSxjQUFjO0FBRXRGLFVBQUksQ0FBQyxPQUFPO0FBQ1YsY0FBTSxJQUFJLE1BQU0sc0JBQXNCO0FBQUEsTUFDeEM7QUFFQSxZQUFNLFVBQVUsTUFDYixRQUFRLFFBQVEsT0FBTyxFQUN2QixRQUFRLFNBQVMsT0FBTyxFQUN4QixRQUFRLE9BQU8sS0FBSztBQUN2QixZQUFNLGNBQWMsUUFBUSxJQUFJLFVBQVUsZUFBZTtBQUN6RCxZQUFNLGNBQWMsUUFBUSxJQUFJLGdCQUFnQjtBQUNoRCxXQUFLLFFBQVEsWUFBWSw2QkFBNkIsV0FBVyxJQUFJLFdBQVcsSUFBSSxPQUFPO0FBQUEsSUFDN0Y7QUFBQSxFQUNGO0FBQ0Y7OztBRGxFQSxJQUFNLGNBQWMsVUFBVTtBQUFBLEVBQzVCLGtCQUFrQjtBQUFBLEVBQ2xCLFFBQVE7QUFDVixDQUFDLEVBQUU7QUFFSCxJQUFPLDBCQUFRLGFBQWE7QUFBQSxFQUMxQixhQUFhLFlBQVksU0FBUyxjQUFjLENBQUMsY0FBYztBQUFBLEVBQy9ELFdBQVc7QUFBQSxFQUNYLFdBQVc7QUFBQSxFQUNYLE9BQU87QUFBQSxFQUNQLE9BQU87QUFBQSxFQUNQLFFBQVE7QUFBQSxFQUNSLE9BQU8sUUFBUSxJQUFJLFVBQVUsTUFBTSxRQUFRLENBQUMsR0FBRyxnQkFBZ0IsR0FBRyxHQUFHLGtCQUFrQixDQUFDO0FBQUEsRUFDeEYsUUFBUSxzQkFBc0I7QUFBQSxFQUM5QixTQUFTLENBQUMsaUJBQWlCLENBQUM7QUFDOUIsQ0FBQzsiLAogICJuYW1lcyI6IFsiZW50cnkiXQp9Cg==
