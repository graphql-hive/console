import { execSync } from 'node:child_process';
import fs from 'node:fs';

const files = await fs.globSync('./**/*.mdx');

const TAGS_TO_REMOVE = ['graphql', 'graphql-hive', 'codegen', 'graphql-federation'];

const postsToRemove = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  let tags = content.match(/tags: \[(.*?)\]/)?.[1];
  if (tags) {
    tags = tags.split(',').map(tag => tag.trim());

    if (TAGS_TO_REMOVE.some(tag => tags.includes(tag))) {
      // here, we keep it
    } else {
      postsToRemove.push(file);
    }
  } else {
    postsToRemove.push(file);
  }
}

for (const post of postsToRemove) {
  fs.unlinkSync(post);
}
