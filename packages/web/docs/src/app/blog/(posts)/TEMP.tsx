/* eslint-disable react/jsx-filename-extension */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

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

  let output = 'Found medium images in:\n';
  for (const { file, images } of filesWithImages) {
    output += `\n${file}:\n`;
    for (const image of images) {
      output += `  ${image}\n`;
    }
  }

  const totalImages = filesWithImages.reduce((sum, { images }) => sum + images.length, 0);
  output += `\nTotal: ${totalImages} images in ${filesWithImages.length} files\n`;

  await writeFile(join(currentDir, 'RAPORT.txt'), output);
  console.log('Report written to RAPORT.txt');
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
