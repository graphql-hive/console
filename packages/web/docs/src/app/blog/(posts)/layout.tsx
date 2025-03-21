import { BlogPostPicture } from '../components/blog-post-layout/blog-post-picture';

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BlogPostPicture />
      {children}
    </>
  );
}
