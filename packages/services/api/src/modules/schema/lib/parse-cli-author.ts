/**
 * Parses CLI author string into name and email components.
 * Supports multiple formats:
 * - Git standard: "John Doe <john@example.com>"
 * - Email only: "john@example.com"
 * - Name only: "John Doe"
 */
export function parseCliAuthor(author: string): { displayName: string; email: string } {
  const trimmed = author.trim();

  // Try to parse "Name <email>" format (git standard)
  const standardMatch = trimmed.match(/^([^<]+)\s+<([^>]+)>$/);
  if (standardMatch) {
    const [, name, email] = standardMatch;
    return {
      displayName: name.trim(),
      email: email.trim(),
    };
  }

  // Check if it's just an email address
  const emailOnlyMatch = trimmed.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if (emailOnlyMatch) {
    return {
      displayName: trimmed,
      email: trimmed,
    };
  }

  // If no format matches, use the whole string as display name
  // Use a placeholder email since GraphQL User type requires it
  return {
    displayName: trimmed,
    email: '<no email provided>',
  };
}
