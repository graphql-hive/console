import { Anchor, CallToAction, ContactButton, Heading } from '@theguild/components';
import { getPageMap } from '@theguild/components/server';
import { HeroLinks } from '../../components/hero';
import { CaseStudyFrontmatter } from './case-studies-header';

export const metadata = {
  title: 'Case Studies',
};

export default async function CaseStudiesPage() {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/case-studies');

  return (
    <article>
      <header>
        <Heading size="xl" as="h1">
          Best teams. Hive-powered.
        </Heading>
        <p>See the results our Customers achieved by switching to Hive.</p>
        <HeroLinks>
          <ContactButton variant="secondary-inverted">Talk to us</ContactButton>
          <CallToAction variant="tertiary" href="/pricing">
            Explore Pricing
          </CallToAction>
        </HeroLinks>
      </header>
      <ul>
        {pageMap.map(item => {
          if ('name' in item && 'frontMatter' in item && item.frontMatter) {
            const frontMatter = item.frontMatter as CaseStudyFrontmatter;

            return (
              <li key={item.name}>
                <Anchor href={item.route}>
                  {item.name}
                  <div>
                    {frontMatter.authors.map(author => {
                      return (
                        <span key={author.name}>
                          {author.name} {author.position}
                        </span>
                      );
                    })}
                  </div>
                </Anchor>
              </li>
            );
          }

          return null;
        })}
      </ul>
    </article>
  );
}
