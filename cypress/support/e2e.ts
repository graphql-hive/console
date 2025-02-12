import './commands';
// Cypress does not support real events, arbitrary keyboard input.
// @see https://github.com/cypress-io/cypress/discussions/19790
// We use this for pressing Alt+F8 in Preflight editor.
// eslint-disable-next-line import/no-extraneous-dependencies
import 'cypress-real-events';

Cypress.on('uncaught:exception', (_err, _runnable) => {
  return false;
});
