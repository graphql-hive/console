import { cyLaboratory } from './_cy';

beforeEach(() => {
  cy.clearAllLocalStorage().then(() => {
    return cy.task('seedTarget').then(({ slug, refreshToken }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);

      cy.visit(`/${slug}/laboratory`);
    });
  });
});

describe('Laboratory > Tabs', () => {
  it('deleting the last tab should reset its state to defaults', () => {
    const op1 = 'query { tab1 }';
    const op2 = 'query { tab2 }';

    // make sure there's only one tab
    cyLaboratory.closeTabsUntilOneLeft();
    cyLaboratory.updateEditorValue(op1);
    cyLaboratory.getEditorValue().should('eq', op1);

    // open a new tab and update its value
    cyLaboratory.openNewTab();
    cyLaboratory.updateEditorValue(op2);
    cyLaboratory.getEditorValue().should('eq', op2);

    // close the second tab
    cyLaboratory.closeActiveTab();
    cyLaboratory.getEditorValue().should('eq', op1);
    // close the first tab
    cyLaboratory.closeActiveTab();
    // it should reset the editor to its default state
    cyLaboratory.getEditorValue().should('not.eq', op1);
  });
});
