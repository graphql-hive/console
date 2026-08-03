/// @ts-check
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const feedUrl = 'https://the-guild.dev/graphql/hive/feed.xml';
const feed = await fetch(feedUrl).then(async res => {
  if (res.status !== 200) {
    console.log('skip feed building; feed is unavailable.');
    return [];
  }

  const parser = new XMLParser();

  const body = await res.text();
  const data = parser.parse(body);
  return data['rss']?.['channel']?.['item'] ?? [];
});

const changelogRecords = [];

for (const data of feed) {
  if (data.title && data.pubDate && data.link) {
    changelogRecords.push({
      date: new Date(data.pubDate).toISOString().split('T')[0],
      href: data.link,
      title: data.title,
      description: data.description || '',
    });
  }
}

// Sort changelogs by date and get the latest 4 records
const latestChangelog = changelogRecords
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 4);

// Generate a TypeScript file with the latest changelogs
const outputFilePath = path.join(
  __dirname,
  '../packages/web/app/src/components/ui/changelog/generated-changelog.ts',
);
const outputContent = `export const latestChangelog = ${JSON.stringify(latestChangelog, null, 2)};\n`;
fs.writeFileSync(outputFilePath, outputContent, 'utf-8');

console.log(`Generated successfully at: ${outputFilePath}`);
