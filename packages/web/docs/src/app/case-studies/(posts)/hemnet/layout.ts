import { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: {
    canonical:
      'https://career.hemnet.se/posts/how-hemnet-migrated-its-graphql-backend-without-anyone-noticing',
  },
};

export default function HemnetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
