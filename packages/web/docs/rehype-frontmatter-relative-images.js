console.log('>> rehypeFrontmatterRelativeImages IMPORTED!');

export default function rehypeFrontmatterRelativeImages() {
  console.log('>> rehypeFrontmatterRelativeImages');
  return (ast, file) => {
    const frontMatterNode = ast.children.find(node => isExportNode(node, 'metadata'));
    const frontMatter = getFrontMatterASTObject(frontMatterNode);
    const keys = ['image', 'thumbnail'];
    for (const key of keys) {
      const value = frontMatter.find(o => o.key.value === key)?.value.value;
      if (!value) continue;

      console.log('>>', key, value, file);
    }

    return ast;
  };
}

function getFrontMatterASTObject(node) {
  const [n] = node.data.estree.body;
  return n.declaration.declarations[0].init.properties;
}

function isExportNode(node, varName) {
  if (node.type !== 'mdxjsEsm') return false;
  const [n] = node.data.estree.body;

  if (n.type !== 'ExportNamedDeclaration') return false;

  const name = n.declaration?.declarations?.[0].id.name;
  if (!name) return false;

  return name === varName;
}
