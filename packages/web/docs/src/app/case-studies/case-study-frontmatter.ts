export type CaseStudyFrontmatter = {
  title: string;
  excerpt: string;
  category: string;
  authors: Author[];
};

export type Author = {
  name: string;
  position?: string;
  avatar?: string;
};
