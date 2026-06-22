// ../../../configs/tsup/dev.config.worker.ts
import { defineConfig } from "tsup";

// ../../../configs/tsup/utils.ts
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

// ../../../configs/tsup/dev.config.worker.ts
var dev_config_worker_default = defineConfig({
  splitting: false,
  sourcemap: true,
  clean: true,
  format: "esm",
  watch: [...commonWatchList(), ...monorepoWatchList()],
  target: targetFromNodeVersion(),
  plugins: [watchEntryPlugin()]
});
export {
  dev_config_worker_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vY29uZmlncy90c3VwL2Rldi5jb25maWcud29ya2VyLnRzIiwgIi4uLy4uLy4uL2NvbmZpZ3MvdHN1cC91dGlscy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX19pbmplY3RlZF9maWxlbmFtZV9fID0gXCJDOlxcXFxVc2Vyc1xcXFxDb2xsZWdlXFxcXERlc2t0b3BcXFxcY29uc29sZVxcXFxjb25maWdzXFxcXHRzdXBcXFxcZGV2LmNvbmZpZy53b3JrZXIudHNcIjtjb25zdCBfX2luamVjdGVkX2Rpcm5hbWVfXyA9IFwiQzpcXFxcVXNlcnNcXFxcQ29sbGVnZVxcXFxEZXNrdG9wXFxcXGNvbnNvbGVcXFxcY29uZmlnc1xcXFx0c3VwXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9DOi9Vc2Vycy9Db2xsZWdlL0Rlc2t0b3AvY29uc29sZS9jb25maWdzL3RzdXAvZGV2LmNvbmZpZy53b3JrZXIudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd0c3VwJztcclxuaW1wb3J0IHtcclxuICBjb21tb25XYXRjaExpc3QsXHJcbiAgbW9ub3JlcG9XYXRjaExpc3QsXHJcbiAgdGFyZ2V0RnJvbU5vZGVWZXJzaW9uLFxyXG4gIHdhdGNoRW50cnlQbHVnaW4sXHJcbn0gZnJvbSAnLi91dGlscyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHNwbGl0dGluZzogZmFsc2UsXHJcbiAgc291cmNlbWFwOiB0cnVlLFxyXG4gIGNsZWFuOiB0cnVlLFxyXG4gIGZvcm1hdDogJ2VzbScsXHJcbiAgd2F0Y2g6IFsuLi5jb21tb25XYXRjaExpc3QoKSwgLi4ubW9ub3JlcG9XYXRjaExpc3QoKV0sXHJcbiAgdGFyZ2V0OiB0YXJnZXRGcm9tTm9kZVZlcnNpb24oKSxcclxuICBwbHVnaW5zOiBbd2F0Y2hFbnRyeVBsdWdpbigpXSxcclxufSk7XHJcbiIsICJjb25zdCBfX2luamVjdGVkX2ZpbGVuYW1lX18gPSBcIkM6XFxcXFVzZXJzXFxcXENvbGxlZ2VcXFxcRGVza3RvcFxcXFxjb25zb2xlXFxcXGNvbmZpZ3NcXFxcdHN1cFxcXFx1dGlscy50c1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCJDOlxcXFxVc2Vyc1xcXFxDb2xsZWdlXFxcXERlc2t0b3BcXFxcY29uc29sZVxcXFxjb25maWdzXFxcXHRzdXBcIjtjb25zdCBfX2luamVjdGVkX2ltcG9ydF9tZXRhX3VybF9fID0gXCJmaWxlOi8vL0M6L1VzZXJzL0NvbGxlZ2UvRGVza3RvcC9jb25zb2xlL2NvbmZpZ3MvdHN1cC91dGlscy50c1wiO2ltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBnZXRQYWNrYWdlc1N5bmMgfSBmcm9tICdAbWFueXBrZy9nZXQtcGFja2FnZXMnO1xyXG5cclxuY29uc3Qgcm9vdERpciA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vJyk7XHJcbmNvbnN0IGxpYkRpciA9IHByb2Nlc3MuY3dkKCk7XHJcbmNvbnN0IHBhY2thZ2VzTWV0YWRhdGEgPSBnZXRQYWNrYWdlc1N5bmMocm9vdERpcik7XHJcbmNvbnN0IGN1cnJlbnRQYWNrYWdlID0gcGFja2FnZXNNZXRhZGF0YS5wYWNrYWdlcy5maW5kKHAgPT4gcC5kaXIgPT09IGxpYkRpcik7XHJcblxyXG5leHBvcnQgY29uc3QgY29tbW9uV2F0Y2hMaXN0ID0gKCkgPT4ge1xyXG4gIHJldHVybiBbXHJcbiAgICBsaWJEaXIgKyAnL3NyYy8qKi8qJyxcclxuICAgIGxpYkRpciArICcvLmVudicsXHJcbiAgICBsaWJEaXIgKyAnL3RzY29uZmlnLmpzb24nLFxyXG4gICAgcm9vdERpciArICcvdHNjb25maWcuanNvbicsXHJcbiAgICByb290RGlyICsgJy90c3VwLmNvbmZpZy4qJyxcclxuICBdO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG1vbm9yZXBvV2F0Y2hMaXN0ID0gKCkgPT4ge1xyXG4gIGlmICghY3VycmVudFBhY2thZ2UpIHtcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGludGVybmFsRGVwcyA9IE9iamVjdC5lbnRyaWVzKHtcclxuICAgIC4uLihjdXJyZW50UGFja2FnZS5wYWNrYWdlSnNvbi5kZXBlbmRlbmNpZXMgfHwge30pLFxyXG4gICAgLi4uKGN1cnJlbnRQYWNrYWdlLnBhY2thZ2VKc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fSksXHJcbiAgICAuLi4oY3VycmVudFBhY2thZ2UucGFja2FnZUpzb24ucGVlckRlcGVuZGVuY2llcyB8fCB7fSksXHJcbiAgfSkucmVkdWNlKChwcmV2LCBbbmFtZSwgdmVyc2lvbl0pID0+IHtcclxuICAgIGlmICh2ZXJzaW9uID09PSAnd29ya3NwYWNlOionKSB7XHJcbiAgICAgIHJldHVybiBbLi4ucHJldiwgbmFtZV07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHByZXY7XHJcbiAgfSwgW10gYXMgc3RyaW5nW10pO1xyXG5cclxuICByZXR1cm4gaW50ZXJuYWxEZXBzLnJlZHVjZSgocHJldiwgZGVwKSA9PiB7XHJcbiAgICBjb25zdCBmb3VuZCA9IHBhY2thZ2VzTWV0YWRhdGEucGFja2FnZXMuZmluZChwID0+IHAucGFja2FnZUpzb24ubmFtZSA9PT0gZGVwKTtcclxuXHJcbiAgICBpZiAoIWZvdW5kKSB7XHJcbiAgICAgIHJldHVybiBwcmV2O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbLi4ucHJldiwgam9pbihmb3VuZC5kaXIsICcvc3JjLyoqLyonKV07XHJcbiAgfSwgW10gYXMgc3RyaW5nW10pO1xyXG59O1xyXG5cclxuY29uc3Qgbm9kZVZlcnNpb24gPSByZWFkRmlsZVN5bmMoam9pbihyb290RGlyLCAnLy5ub2RlLXZlcnNpb24nKSkudG9TdHJpbmcoKTtcclxuXHJcbmV4cG9ydCBjb25zdCB0YXJnZXRGcm9tTm9kZVZlcnNpb24gPSAoKSA9PiB7XHJcbiAgY29uc3QgY2xlYW4gPSBub2RlVmVyc2lvbi50cmltKCkuc3BsaXQoJy4nKTtcclxuXHJcbiAgcmV0dXJuIGBub2RlJHtjbGVhblswXX1gIGFzIGFueTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCB3YXRjaEVudHJ5UGx1Z2luID0gKCkgPT4ge1xyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnbm9kZS13YXRjaC1lbnRyeScsXHJcbiAgICBlc2J1aWxkT3B0aW9ucyhvcHRpb25zKSB7XHJcbiAgICAgIGNvbnN0IGVudHJpZXMgPSAob3B0aW9ucy5lbnRyeVBvaW50cyBhcyBzdHJpbmdbXSkgfHwgW107XHJcbiAgICAgIGNvbnN0IGVudHJ5ID0gZW50cmllcy5maW5kKGVudHJ5ID0+IGVudHJ5ID09PSAnc3JjL2Rldi50cycgfHwgZW50cnkgPT09ICd0ZXN0L3Jvb3QudHMnKTtcclxuXHJcbiAgICAgIGlmICghZW50cnkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGVudHJ5IHBvaW50IGZvdW5kJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IG91dEZpbGUgPSBlbnRyeVxyXG4gICAgICAgIC5yZXBsYWNlKCdzcmMvJywgJ2Rpc3QvJylcclxuICAgICAgICAucmVwbGFjZSgndGVzdC8nLCAnZGlzdC8nKVxyXG4gICAgICAgIC5yZXBsYWNlKCcudHMnLCAnLmpzJyk7XHJcbiAgICAgIGNvbnN0IGluc3BlY3RGbGFnID0gcHJvY2Vzcy5lbnYuSU5TUEVDVCA/ICctLWluc3BlY3QgJyA6ICcgJztcclxuICAgICAgY29uc3Qgbm9kZU9wdGlvbnMgPSBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgfHwgJyc7XHJcbiAgICAgIHRoaXMub3B0aW9ucy5vblN1Y2Nlc3MgPSBgbm9kZSAtLWVuYWJsZS1zb3VyY2UtbWFwcyAke2luc3BlY3RGbGFnfSAke25vZGVPcHRpb25zfSAke291dEZpbGV9IHwgcGluby1wcmV0dHkgLS10cmFuc2xhdGVUaW1lIEhIOk1NOnNzIFRUIC0taWdub3JlIHBpZCxob3N0bmFtZWA7XHJcbiAgICB9LFxyXG4gIH07XHJcbn07XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1MsU0FBUyxvQkFBb0I7OztBQ0FyRCxTQUFTLG9CQUFvQjtBQUNwVCxTQUFTLE1BQU0sZUFBZTtBQUM5QixTQUFTLHVCQUF1QjtBQUY4RCxJQUFNLHVCQUF1QjtBQUkzSCxJQUFNLFVBQVUsUUFBUSxzQkFBVyxRQUFRO0FBQzNDLElBQU0sU0FBUyxRQUFRLElBQUk7QUFDM0IsSUFBTSxtQkFBbUIsZ0JBQWdCLE9BQU87QUFDaEQsSUFBTSxpQkFBaUIsaUJBQWlCLFNBQVMsS0FBSyxPQUFLLEVBQUUsUUFBUSxNQUFNO0FBRXBFLElBQU0sa0JBQWtCLE1BQU07QUFDbkMsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLElBQ1QsU0FBUztBQUFBLElBQ1QsU0FBUztBQUFBLElBQ1QsVUFBVTtBQUFBLElBQ1YsVUFBVTtBQUFBLEVBQ1o7QUFDRjtBQUVPLElBQU0sb0JBQW9CLE1BQU07QUFDckMsTUFBSSxDQUFDLGdCQUFnQjtBQUNuQixXQUFPLENBQUM7QUFBQSxFQUNWO0FBRUEsUUFBTSxlQUFlLE9BQU8sUUFBUTtBQUFBLElBQ2xDLEdBQUksZUFBZSxZQUFZLGdCQUFnQixDQUFDO0FBQUEsSUFDaEQsR0FBSSxlQUFlLFlBQVksbUJBQW1CLENBQUM7QUFBQSxJQUNuRCxHQUFJLGVBQWUsWUFBWSxvQkFBb0IsQ0FBQztBQUFBLEVBQ3RELENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sT0FBTyxNQUFNO0FBQ25DLFFBQUksWUFBWSxlQUFlO0FBQzdCLGFBQU8sQ0FBQyxHQUFHLE1BQU0sSUFBSTtBQUFBLElBQ3ZCO0FBRUEsV0FBTztBQUFBLEVBQ1QsR0FBRyxDQUFDLENBQWE7QUFFakIsU0FBTyxhQUFhLE9BQU8sQ0FBQyxNQUFNLFFBQVE7QUFDeEMsVUFBTSxRQUFRLGlCQUFpQixTQUFTLEtBQUssT0FBSyxFQUFFLFlBQVksU0FBUyxHQUFHO0FBRTVFLFFBQUksQ0FBQyxPQUFPO0FBQ1YsYUFBTztBQUFBLElBQ1Q7QUFFQSxXQUFPLENBQUMsR0FBRyxNQUFNLEtBQUssTUFBTSxLQUFLLFdBQVcsQ0FBQztBQUFBLEVBQy9DLEdBQUcsQ0FBQyxDQUFhO0FBQ25CO0FBRUEsSUFBTSxjQUFjLGFBQWEsS0FBSyxTQUFTLGdCQUFnQixDQUFDLEVBQUUsU0FBUztBQUVwRSxJQUFNLHdCQUF3QixNQUFNO0FBQ3pDLFFBQU0sUUFBUSxZQUFZLEtBQUssRUFBRSxNQUFNLEdBQUc7QUFFMUMsU0FBTyxPQUFPLE1BQU0sQ0FBQyxDQUFDO0FBQ3hCO0FBRU8sSUFBTSxtQkFBbUIsTUFBTTtBQUNwQyxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixlQUFlLFNBQVM7QUFDdEIsWUFBTSxVQUFXLFFBQVEsZUFBNEIsQ0FBQztBQUN0RCxZQUFNLFFBQVEsUUFBUSxLQUFLLENBQUFBLFdBQVNBLFdBQVUsZ0JBQWdCQSxXQUFVLGNBQWM7QUFFdEYsVUFBSSxDQUFDLE9BQU87QUFDVixjQUFNLElBQUksTUFBTSxzQkFBc0I7QUFBQSxNQUN4QztBQUVBLFlBQU0sVUFBVSxNQUNiLFFBQVEsUUFBUSxPQUFPLEVBQ3ZCLFFBQVEsU0FBUyxPQUFPLEVBQ3hCLFFBQVEsT0FBTyxLQUFLO0FBQ3ZCLFlBQU0sY0FBYyxRQUFRLElBQUksVUFBVSxlQUFlO0FBQ3pELFlBQU0sY0FBYyxRQUFRLElBQUksZ0JBQWdCO0FBQ2hELFdBQUssUUFBUSxZQUFZLDZCQUE2QixXQUFXLElBQUksV0FBVyxJQUFJLE9BQU87QUFBQSxJQUM3RjtBQUFBLEVBQ0Y7QUFDRjs7O0FEbkVBLElBQU8sNEJBQVEsYUFBYTtBQUFBLEVBQzFCLFdBQVc7QUFBQSxFQUNYLFdBQVc7QUFBQSxFQUNYLE9BQU87QUFBQSxFQUNQLFFBQVE7QUFBQSxFQUNSLE9BQU8sQ0FBQyxHQUFHLGdCQUFnQixHQUFHLEdBQUcsa0JBQWtCLENBQUM7QUFBQSxFQUNwRCxRQUFRLHNCQUFzQjtBQUFBLEVBQzlCLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQztBQUM5QixDQUFDOyIsCiAgIm5hbWVzIjogWyJlbnRyeSJdCn0K
