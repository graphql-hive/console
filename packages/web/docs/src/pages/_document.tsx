import { DocumentProps, Head, Html, Main, NextScript } from 'next/document';
import { isPageWithFaq } from '../lib';

export default function Document(props: DocumentProps) {
  // Can't do <Head><html .../></Head>...
  // We need to add the structured data attributes
  // to the html tag this way.
  // We can remove this when Nextra is fixed
  // Currently, the pages with FAQ are:
  // /
  // /federation
  // /pricing
  //
  // This workaround works only partially.
  // Yes, the structured data is added to the html tag on initial page visit,
  // but when navigating to another page, the structured data is not updated,
  // and the html tag is showing the structured data from the previous page.
  // That's why we need to listen to the route change and update the structured data.
  // See: usePageFAQSchema in lib.ts
  const isFAQPage = isPageWithFaq(props.__NEXT_DATA__.page);

  return (
    // We can drop it when Nextra is fixed
    // The html[lang] is not being added by Nextra
    <Html
      lang="en"
      {...(isFAQPage
        ? {
            itemScope: true,
            itemType: 'https://schema.org/FAQPage',
          }
        : {})}
    >
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
