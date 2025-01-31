type ParseError = {
  type: 'error';
};

type ParseOk = {
  type: 'ok';
  data: {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
  };
};

/**
 * Parse a target slug into its parts. Returns an error if slug is invalid
 */
export function parse(str: string): ParseError | ParseOk {
  const parts = str.split('/');

  const organizationSlug = parts.at(0);
  const projectSlug = parts.at(1);
  const targetSlug = parts.at(2);

  if (!organizationSlug || !projectSlug || !targetSlug) {
    return {
      type: 'error',
    };
  }

  return {
    type: 'ok',
    data: {
      organizationSlug,
      projectSlug,
      targetSlug,
    },
  };
}
