import './commands';
import 'cypress-localstorage-commands';

Cypress.on('uncaught:exception', (_err, _runnable) => {
  return false;
});
