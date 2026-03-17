import { ReactElement } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { getPageMap } from '@theguild/components/server';

type Changelog = {
  title: string;
  date: string;
  description: string;
  route: string;
};

export async function ProductUpdatesPage() {
  const changelogs = await getChangelogs();

  return (
    <ol className="relative mt-12 border-l border-gray-200 dark:border-gray-700">
      {changelogs.map(item => (
        <ProductUpdateTeaser key={item.route} {...item} />
      ))}
    </ol>
  );
}

function ProductUpdateTeaser(props: Changelog): ReactElement {
  return (
    <li className="mb-10 ml-4">
      <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full border border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-700" />
      <time
        className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500"
        dateTime={props.date}
      >
        {format(new Date(props.date), 'do MMMM yyyy')}
      </time>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        <Link href={props.route}>{props.title}</Link>
      </h3>
      <div className="mb-4 mt-1 max-w-[600px] text-base font-normal leading-6 text-gray-500 dark:text-gray-400">
        {props.description}
      </div>
    </li>
  );
}

export async function getChangelogs(): Promise<Changelog[]> {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/product-updates');

  return pageMap
    .map(item => {
      if ('data' in item || 'children' in item) {
        throw new Error('Incorrect page map');
      }
      const { route, frontMatter = {} } = item;
      let date: string;

      try {
        date = new Date(frontMatter.date || item.name.slice(0, 10)).toISOString();
      } catch (error) {
        console.error(`Error parsing date \`${frontMatter.date}\` for ${item.name}: ${error}`);
        throw error;
      }
      return {
        title: frontMatter.title,
        date,
        description: frontMatter.description,
        route,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
