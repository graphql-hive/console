import { cyLaboratory } from './_cy';

beforeEach(() => {
  cy.clearAllLocalStorage().then(() => {
    return cy.task('seedTarget').then(({ slug, refreshToken }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);

      cy.visit(`/${slug}/laboratory`);

      // To make sure the operation collections tab is opened
      // It first opens the Documentation Explorer or GraphiQL Explorer,
      // then opens the Operation Collections tab.
      // It does that, because the Operation Collections tab could be already opened for some reason.
      // This way it's guaranteed that the Operation Collections tab is opened.
      cy.get('[aria-label*="Show Documentation Explorer"], [aria-label*="Show GraphiQL Explorer"]')
        .first()
        .click();
      cy.get('[aria-label="Show Operation Collections"]').click();
      cyLaboratory.closeTabsUntilOneLeft();
    });
  });
});

const collections = {
  /**
   * Opens the modal to create a new collection and fills the form
   */
  create(args: { name: string; description: string }) {
    cy.get('button[data-cy="new-collection"]').click();
    cy.get('div[data-cy="create-collection-modal"] input[name="name"]').type(args.name);
    cy.get('div[data-cy="create-collection-modal"] input[name="description"]').type(
      args.description,
    );
    cy.get('div[data-cy="create-collection-modal"] button[type="submit"]').click();
  },
  /**
   * Clicks on a collection in the sidebar
   */
  clickCollectionButton(name: string) {
    cy.get('button[data-cy="collection-item-trigger"]').contains(name).click();
  },
  /**
   * Saves the current operation as a new operation and assigns it to a collection
   */
  saveCurrentOperationAs(args: { name: string; collectionName: string }) {
    cy.get('[data-cy="save-operation"]').click();
    cy.get('[data-cy="save-operation-as"]').click();

    cy.get('div[data-cy="create-operation-modal"] input[name="name"]').type(args.name);
    cy.get(
      'div[data-cy="create-operation-modal"] button[data-cy="collection-select-trigger"]',
    ).click();

    cy.get('div[data-cy="collection-select-item"]').contains(args.collectionName).click();
    cy.get('div[data-cy="create-operation-modal"] button[type="submit"]').click();
  },
  /**
   * Opens the menu for a specific operation, to access delete, copy link or edit buttons.
   */
  openOperationMenu(name: string) {
    return cy.get(`a[data-cy="operation-${name}"] ~ button`).click();
  },
  /**
   * Opens the menu for a specific collection, to access delete or edit buttons.
   */
  openCollectionMenu(name: string) {
    return cy
      .contains(`[data-cy="collection-item-trigger"]`, name)
      .parent()
      .get('[data-cy="collection-menu-trigger"]')
      .click();
  },
  /**
   * Returns the operation element
   */
  getOperationButton(name: string) {
    return cy.get<HTMLAnchorElement>(`a[data-cy="operation-${name}"]`);
  },
  /**
   * Returns the collection element
   */
  getCollectionButton(name: string) {
    return cy.contains('[data-cy="collection-item"]', name);
  },
};

describe('Laboratory > Collections', () => {
  it('create a collection and an operation', () => {
    collections.create({
      name: 'collection-1',
      description: 'Description 1',
    });
    cyLaboratory.updateEditorValue(`query op1 { test }`);
    collections.saveCurrentOperationAs({
      name: 'operation-1',
      collectionName: 'collection-1',
    });
    collections.getOperationButton('operation-1').should('exist');
  });

  it(`edit collection's name`, () => {
    collections.create({
      name: 'collection-1',
      description: 'Description 1',
    });
    cyLaboratory.updateEditorValue(`query op1 { test }`);
    collections.saveCurrentOperationAs({
      name: 'operation-1',
      collectionName: 'collection-1',
    });

    collections.openCollectionMenu('collection-1');
    // Click on the edit button and fill the form
    cy.get('[data-cy="edit-collection"]').click();
    cy.get('[data-cy="create-collection-modal"]').should('exist');
    cy.get('[data-cy="create-collection-modal"] input[name="name"]')
      .clear()
      .type('collection-1-updated');
    cy.get('[data-cy="create-collection-modal"] button[data-cy="confirm"]').click();

    collections.getCollectionButton('collection-1-updated').should('exist');
    collections.getOperationButton('operation-1').should('exist');
  });

  it('delete a collection', () => {
    collections.create({
      name: 'collection-1',
      description: 'Description 1',
    });
    cyLaboratory.updateEditorValue(`query op1 { test }`);
    collections.saveCurrentOperationAs({
      name: 'operation-1',
      collectionName: 'collection-1',
    });

    collections.getOperationButton('operation-1').should('exist');
    collections.getCollectionButton('collection-1').should('exist');

    collections.openCollectionMenu('collection-1');
    // Click on the delete button and confirm the deletion
    cy.get('[data-cy="delete-collection"]').click();
    cy.get('[data-cy="delete-collection-modal"]').should('exist');
    cy.get('[data-cy="delete-collection-modal"] button[data-cy="confirm"]').click();

    collections.getOperationButton('operation-1').should('not.exist');
    collections.getCollectionButton('collection-1').should('not.exist');
  });

  it(`edit operation's name`, () => {
    collections.create({
      name: 'collection-1',
      description: 'Description 1',
    });
    cyLaboratory.updateEditorValue(`query op1 { test }`);
    collections.saveCurrentOperationAs({
      name: 'operation-1',
      collectionName: 'collection-1',
    });

    collections.openOperationMenu('operation-1');
    // Click on the edit button and fill the form
    cy.get('[data-cy="edit-operation"]').click();
    cy.get('[data-cy="edit-operation-modal"]').should('exist');
    cy.get('[data-cy="edit-operation-modal"] input[name="name"]').type('operation-1-updated');
    cy.get('[data-cy="edit-operation-modal"] button[data-cy="confirm"]').click();

    collections.getOperationButton('operation-1').should('not.exist');
    collections.getOperationButton('operation-1-updated').should('exist');
  });

  it('delete an operation', () => {
    collections.create({
      name: 'collection-1',
      description: 'Description 1',
    });
    cyLaboratory.updateEditorValue(`query op1 { test }`);
    collections.saveCurrentOperationAs({
      name: 'operation-1',
      collectionName: 'collection-1',
    });

    cyLaboratory.openNewTab();
    cyLaboratory.updateEditorValue(`query op2 { test }`);
    collections.saveCurrentOperationAs({
      name: 'operation-2',
      collectionName: 'collection-1',
    });

    collections.openOperationMenu('operation-1');
    // Click on the delete button and confirm the deletion
    cy.get('[data-cy="delete-operation"]').click();
    cy.get('[data-cy="delete-operation-modal"]').should('exist');
    cy.get('[data-cy="delete-operation-modal"] button[data-cy="confirm"]').click();

    collections.getOperationButton('operation-1').should('not.exist');
    collections.getOperationButton('operation-2').should('exist');
  });

  it('visiting a copied operation link should open the operation', () => {
    collections.create({
      name: 'collection-1',
      description: 'Description 1',
    });
    collections.create({
      name: 'collection-2',
      description: 'Description 2',
    });
    collections.clickCollectionButton('collection-1');
    cyLaboratory.updateEditorValue(`query op1 { test }`);
    collections.saveCurrentOperationAs({
      name: 'operation-1',
      collectionName: 'collection-1',
    });

    cyLaboratory.openNewTab();
    cyLaboratory.updateEditorValue(`query op2 { test }`);
    collections.saveCurrentOperationAs({
      name: 'operation-2',
      collectionName: 'collection-2',
    });

    collections.openOperationMenu('operation-1');

    // Stub the clipboard API to intercept the copied URL
    cy.window().then(win => {
      cy.stub(win.navigator.clipboard, 'writeText').as('copied');
    });

    cy.get('[data-cy="copy-operation-link"]').click();

    cy.get<{
      getCall(index: number): {
        args: unknown[];
      };
    }>('@copied')
      .should('have.been.calledOnce')
      .then(stub => {
        const copiedUrl = stub.getCall(0).args[0]; // Extract the copied URL
        if (typeof copiedUrl !== 'string') {
          throw new Error('The copied URL is not a string');
        }
        // Navigate to the copied URL
        return cy.visit(copiedUrl);
      });

    cyLaboratory.assertActiveTab('operation-1');
    cyLaboratory.getEditorValue().should('contain', 'op1');
  });
});
