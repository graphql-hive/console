export function generateRandomSlug() {
  return Math.random().toString(36).substring(2);
}

export function getUserData() {
  return {
    email: `${crypto.randomUUID()}@local.host`,
    password: 'Loc@l.h0st',
    firstName: 'Local',
    lastName: 'Host',
  };
}

export function waitForTargetPage(targetSlug: string) {
  cy.get(`[data-cy="target-picker-current"]`).contains(targetSlug);
}

export function waitForProjectPage(projectSlug: string) {
  cy.get(`[data-cy="project-picker-current"]`).contains(projectSlug);
}

export function waitForOrganizationPage(organizationSlug: string) {
  cy.get(`[data-cy="organization-picker-current"]`).contains(organizationSlug);
}

export function createUserAndOrganization(organizationSlug: string) {
  const user = getUserData();

  cy.visit('/');
  cy.signup(user);
  cy.get('input[name="slug"]').type(organizationSlug);
  cy.get('button[type="submit"]').click();
}

export function createProject(projectSlug: string) {
  cy.get('[data-cy="new-project-button"]').click();
  cy.get('form[data-cy="create-project-form"] [data-cy="slug"]').type(projectSlug);
  cy.get('form[data-cy="create-project-form"] [data-cy="submit"]').click();
}
