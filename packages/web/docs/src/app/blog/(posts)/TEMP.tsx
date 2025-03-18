/* eslint-disable react/jsx-filename-extension */
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rmdir,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const postsDir = currentDir;
const assetsDir = join(currentDir, '../blog-assets');

const findMdxFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return findMdxFiles(path);
      }
      return entry.isFile() && entry.name.endsWith('.mdx') ? [path] : [];
    }),
  );
  return files.flat();
};

const findMediumImages = async (filePath: string): Promise<{ file: string; images: string[] }> => {
  const content = await readFile(filePath, 'utf-8');
  const imageMatches = [...content.matchAll(/(?:image:|src="|!\[\])\s*\(?\/medium\/[^)"'\s]+/g)];

  const images = imageMatches
    .map(match => {
      const pathMatch = match[0].match(/\/medium\/[^)"'\s]+/);
      if (!pathMatch) return null;
      return pathMatch[0];
    })
    .filter((path): path is string => path !== null);

  return { file: filePath, images };
};

const processFile = async (filePath: string) => {
  const content = await readFile(filePath, 'utf-8');

  if (!content.includes('$2')) {
    return;
  }

  const newContent = content.replace(/([^"'\`]*)\\$2/g, '$1');

  if (newContent !== content) {
    console.log(`Updating ${filePath}`);
    console.log('Found matches:');
    const matches = content.match(/[^"'\`]*\\$2/g);
    if (matches) {
      for (const match of matches) {
        const fixed = match.replace('$2', '');
        console.log(`  ${match} → ${fixed}`);
      }
    }
    await writeFile(filePath, newContent);
  }
};

const main = async () => {
  const mdxFiles = await findMdxFiles(currentDir);
  console.log(`Found ${mdxFiles.length} MDX files`);

  const results = await Promise.all(
    mdxFiles.map(async (file, index) => {
      const progress = `[${index + 1}/${mdxFiles.length}]`;
      console.log(`${progress} Processing ${file}`);
      return findMediumImages(file);
    }),
  );

  const filesWithImages = results.filter(result => result.images.length > 0);

  console.log('\nFound medium images in:');
  for (const { file, images } of filesWithImages) {
    console.log(`\n${file}:`);
    for (const image of images) {
      console.log(`  ${image}`);
    }
  }

  const totalImages = filesWithImages.reduce((sum, { images }) => sum + images.length, 0);
  console.log(`\nTotal: ${totalImages} images in ${filesWithImages.length} files`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
