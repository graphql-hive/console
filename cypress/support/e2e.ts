import './commands';
import 'cypress-real-events';

Cypress.on('uncaught:exception', (_err, _runnable) => {
  return false;
});
