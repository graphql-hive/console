import { mkdir, readdir, rename, stat } from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';

const reorganizeMdxFiles = async (directory: string) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const mdxFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.mdx'));

  const moves = await Promise.all(
    mdxFiles.map(async file => {
      const fullPath = join(directory, file.name);
      const { name, dir } = parse(fullPath);

      if (name === 'index') {
        const newPath = join(dir, 'page.mdx');
        return { from: fullPath, to: newPath };
      }

      const newDir = join(dir, name);
      const newPath = join(newDir, 'page.mdx');
      await stat(newDir).catch(() => mkdir(newDir, { recursive: true }));
      return { from: fullPath, to: newPath };
    }),
  );

  await Promise.all(moves.map(({ from, to }) => rename(from, to)));
};

const currentDir = process.cwd();
reorganizeMdxFiles(currentDir).catch(error => {
  console.error(error);
  process.exit(1);
});
