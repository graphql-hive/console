export function prettyPrintTag(tag: string) {
  let text = tag || 'All';
  if (text === 'typescript') {
    text = 'TypeScript';
  }
  if (text === 'css') {
    text = 'CSS';
  }
  text = text.replace('graphql', 'GraphQL');
  text = text.replace(/-js$/, ' JS');
  text = text[0].toUpperCase() + text.slice(1);
  text = text.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  return text;
}
