/* eslint-disable react/jsx-filename-extension */
import { copyFile, mkdir, readdir, rmdir, stat, unlink } from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const postsDir = currentDir;
const assetsDir = join(currentDir, '../blog-assets');

const removeEmptyDirs = async () => {
  const assetDirs = await readdir(assetsDir, { withFileTypes: true });
  const postDirs = assetDirs.filter(dir => dir.isDirectory());

  await Promise.all(
    postDirs.map(async dir => {
      const sourceDir = join(assetsDir, dir.name);
      const files = await readdir(sourceDir);

      if (files.length === 0) {
        console.log(`Removing empty directory: ${sourceDir}`);
        await rmdir(sourceDir);
      }
    }),
  );
};

removeEmptyDirs().catch(error => {
  console.error(error);
  process.exit(1);
});
