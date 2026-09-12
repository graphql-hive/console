/**
 * The signed-in user in mock mode. Never a real person.
 * Booleans like isAdmin are left to the mock layer so scenarios can flip them.
 */
export const MOCK_USER = {
  id: 'mock-user',
  email: 'user@the-guild.dev',
  displayName: 'Mock User',
  fullName: 'Mock User',
} as const;
