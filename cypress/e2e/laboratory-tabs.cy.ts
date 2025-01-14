import { laboratory } from '../support/testkit';

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
    laboratory.closeTabsUntilOneLeft();
    laboratory.updateEditorValue(op1);
    laboratory.getEditorValue().should('eq', op1);

    // open a new tab and update its value
    laboratory.openNewTab();
    laboratory.updateEditorValue(op2);
    laboratory.getEditorValue().should('eq', op2);

    // close the second tab
    laboratory.closeActiveTab();
    laboratory.getEditorValue().should('eq', op1);
    // close the first tab
    laboratory.closeActiveTab();
    // it should reset the editor to its default state
    laboratory.getEditorValue().should('not.eq', op1);
  });
});
