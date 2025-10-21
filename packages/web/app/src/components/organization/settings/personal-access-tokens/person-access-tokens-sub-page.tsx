import { CardDescription } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';

type PersonalAccessTokensSubPageProps = {};

export function PersonalAccessTokensSubPage(
  props: PersonalAccessTokensSubPageProps,
): React.ReactNode {
  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Personal Access Tokens"
        description={
          <>
            <CardDescription>TBD</CardDescription>
            <CardDescription>
              <DocsLink
                href="/management/access-tokens"
                className="text-gray-500 hover:text-gray-300"
              >
                Learn more about Access Tokens
              </DocsLink>
            </CardDescription>
          </>
        }
      />
    </SubPageLayout>
  );
}
