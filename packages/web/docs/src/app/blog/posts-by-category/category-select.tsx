import { CategoryFilterLink } from './category-filter-link';

export function CategorySelect({
  currentCategory,
  categories,
}: {
  currentCategory: string | null;
  categories: string[];
}) {
  return (
    <ul>
      <li>
        <CategoryFilterLink category={null} currentCategory={currentCategory} />
      </li>
      {categories.map(category => (
        <li key={category}>
          <CategoryFilterLink category={category} currentCategory={currentCategory} />
        </li>
      ))}
    </ul>
  );
}
