/* eslint-disable react/jsx-filename-extension */
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const mediumDir = join(currentDir, '..', 'medium');

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

const copyMediumImage = async (imagePath: string, targetDir: string) => {
  const sourceFile = join(mediumDir, basename(imagePath));
  const targetFile = join(targetDir, basename(imagePath));

  try {
    await mkdir(targetDir, { recursive: true });
    await copyFile(sourceFile, targetFile);
    return { success: true, path: targetFile };
  } catch (error) {
    return { success: false, path: sourceFile, error };
  }
};

const updateImagePaths = async (filePath: string) => {
  const content = await readFile(filePath, 'utf-8');

  if (!content.includes('/medium/')) {
    return { file: filePath, modified: false, count: 0 };
  }

  // Simple search and replace
  const newContent = content.replace(/\/medium\//g, './');

  if (newContent !== content) {
    await writeFile(filePath, newContent);
    const count = (content.match(/\/medium\//g) || []).length;
    return { file: filePath, modified: true, count };
  }

  return { file: filePath, modified: false, count: 0 };
};

const updateImportPaths = async (filePath: string) => {
  try {
    const content = await readFile(filePath, 'utf-8');
    const dirName = basename(dirname(filePath));

    // Look for import statements with directory paths
    const importRegex = /import __img\d+ from "\.\/([\w-]+)\/([^"]+)"/g;

    if (!content.match(importRegex)) {
      return { file: filePath, modified: false, count: 0 };
    }

    // Replace the import paths to reference files directly in the current directory
    const newContent = content.replace(importRegex, (_match, _dir, fileName) => {
      return `import __img$1 from "./${fileName}"`;
    });

    if (newContent !== content) {
      await writeFile(filePath, newContent);
      const count = (content.match(importRegex) || []).length;
      return { file: filePath, modified: true, count };
    }

    return { file: filePath, modified: false, count: 0 };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return { file: filePath, modified: false, count: 0 };
  }
};

const main = async () => {
  const mdxFiles = await findMdxFiles(currentDir);
  console.log(`Found ${mdxFiles.length} MDX files`);

  const results = await Promise.all(
    mdxFiles.map(async (file, index) => {
      const progress = `[${index + 1}/${mdxFiles.length}]`;
      console.log(`${progress} Processing ${file}`);
      return updateImportPaths(file);
    }),
  );

  const modifiedFiles = results.filter(result => result.modified);

  let output = 'Updated import paths in MDX files:\n';
  for (const { file, count } of modifiedFiles) {
    output += `\n${file}: ${count} replacements\n`;
  }

  const totalReplacements = modifiedFiles.reduce((sum, { count }) => sum + count, 0);
  output += `\nTotal: ${totalReplacements} replacements in ${modifiedFiles.length} files\n`;

  await writeFile(join(currentDir, 'RAPORT.txt'), output);
  console.log('Report written to RAPORT.txt');
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
