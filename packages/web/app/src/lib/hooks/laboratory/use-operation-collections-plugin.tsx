import { useEffect, useState } from 'react';
import {
  BookmarkIcon,
  EllipsisIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  SquareTerminalIcon,
} from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { CreateCollectionModal } from '@/components/target/laboratory/create-collection-modal';
import { DeleteCollectionModal } from '@/components/target/laboratory/delete-collection-modal';
import { DeleteOperationModal } from '@/components/target/laboratory/delete-operation-modal';
import { EditOperationModal } from '@/components/target/laboratory/edit-operation-modal';
import { Link } from '@/components/ui/link';
import { Accordion } from '@/components/ui/primitives/accordion/accordion';
import { Button } from '@/components/ui/primitives/button/button';
import { Menu } from '@/components/ui/primitives/floating/menu/menu';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { Skeleton } from '@/components/ui/primitives/skeleton/skeleton';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { graphql } from '@/gql';
import { useClipboard, useToggle } from '@/lib/hooks';
import { useOperationFromQueryString } from '@/lib/hooks/laboratory/useOperationFromQueryString';
import { cn } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { GraphiQLPlugin, useEditorContext, usePluginContext } from '@graphiql/react';
import { getRouteApi, useRouter } from '@tanstack/react-router';
import { useCollections } from './use-collections';
import { useCurrentOperation } from './use-current-operation';
import { useSyncOperationState } from './use-sync-operation-state';
import { operationCollectionsPluginStyles } from './use-operation-collections-plugin.css';

// The accordion hands out no ref, so the operation opened from the URL is found by id instead.
const targetRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug',
);

const COLLECTIONS_ID = 'laboratory-collections';

const CreateOperationMutation = graphql(`
  mutation CreateOperation(
    $selector: TargetSelectorInput!
    $input: CreateDocumentCollectionOperationInput!
  ) {
    createOperationInDocumentCollection(selector: $selector, input: $input) {
      error {
        message
      }
      ok {
        operation {
          id
          name
        }
        updatedTarget {
          id
          documentCollections {
            edges {
              cursor
              node {
                id
                operations {
                  edges {
                    node {
                      id
                    }
                    cursor
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

export const TargetLaboratoryPageQuery = graphql(`
  query TargetLaboratoryPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      id
      graphqlEndpointUrl
      latestSchemaVersion {
        id
        sdl
      }
      viewerCanModifyLaboratory
      ...PreflightScript_TargetFragment
    }
    ...Laboratory_IsCDNEnabledFragment
  }
`);

export const operationCollectionsPlugin: GraphiQLPlugin = {
  title: 'Operation Collections',
  content: Content,
  icon: function Icon() {
    const pluginContext = usePluginContext();
    const active = pluginContext?.visiblePlugin === operationCollectionsPlugin;
    return <BookmarkIcon fill={active ? 'currentColor' : 'none'} />;
  },
};

export function Content() {
  const { organizationSlug, projectSlug, targetSlug } = targetRoute.useParams();
  const [query] = useQuery({
    query: TargetLaboratoryPageQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
    },
  });
  const canEdit = query.data?.target?.viewerCanModifyLaboratory === true;
  const canDelete = query.data?.target?.viewerCanModifyLaboratory === true;

  const [isCollectionModalOpen, toggleCollectionModal] = useToggle();
  const { collections, fetching: loading } = useCollections({
    organizationSlug,
    projectSlug,
    targetSlug,
  });
  const [collectionId, setCollectionId] = useState('');
  const [isDeleteCollectionModalOpen, toggleDeleteCollectionModalOpen] = useToggle();
  const [isDeleteOperationModalOpen, toggleDeleteOperationModalOpen] = useToggle();
  const [operationToDeleteId, setOperationToDeleteId] = useState<null | string>(null);
  const [operationToEditId, setOperationToEditId] = useState<null | string>(null);
  const { clearOperation, savedOperation, setSavedOperation } = useSyncOperationState({
    organizationSlug,
    projectSlug,
    targetSlug,
  });
  const router = useRouter();
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const copyToClipboard = useClipboard();

  const currentOperation = useCurrentOperation({
    organizationSlug,
    projectSlug,
    targetSlug,
  });
  const { queryEditor, variableEditor, headerEditor, tabs, changeTab, addTab } = useEditorContext({
    nonNull: true,
  });

  const hasAllEditors = !!(queryEditor && variableEditor && headerEditor);
  const queryParamsOperationId = useOperationFromQueryString();
  const activeTab = tabs.find(tab => tab.id === queryParamsOperationId);

  const isSame =
    !currentOperation ||
    !activeTab ||
    (currentOperation.query === activeTab.query &&
      currentOperation.variables === activeTab.variables &&
      currentOperation.headers === (activeTab.headers || ''));

  useEffect(() => {
    if (!hasAllEditors || !currentOperation) {
      const searchObj = router.latestLocation.search;
      const operationString =
        'operationString' in searchObj && typeof searchObj.operationString === 'string'
          ? searchObj.operationString
          : null;

      // We provide an operation string when navigating to the laboratory from persisted documents
      // in that case we want to show that operation within this tab.
      if (operationString) {
        queryEditor?.setValue(operationString);
        variableEditor?.setValue('');
        headerEditor?.setValue('');
      }

      return;
    }

    if (queryParamsOperationId) {
      const tabIndex = tabs.findIndex(tab => tab.id === queryParamsOperationId);

      if (tabIndex !== -1) {
        changeTab(tabIndex);
        return;
      }
      // Set selected operation in editors
      addTab({
        id: queryParamsOperationId,
        query: (savedOperation || currentOperation).query,
        variables: (savedOperation || currentOperation).variables,
        headers: currentOperation.headers,
        title: currentOperation.name,
      });

      if (!savedOperation) {
        return;
      }

      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (savedOperation.updatedAt + oneWeek < Date.now()) {
        clearOperation();
        return;
      }

      const currentOperationUpdatedAt = new Date(currentOperation.updatedAt).getTime();
      if (savedOperation.updatedAt > currentOperationUpdatedAt) {
        queryEditor.setValue(savedOperation.query);
        variableEditor.setValue(savedOperation.variables);
      }
    }
  }, [hasAllEditors, queryParamsOperationId, currentOperation]);

  useEffect(() => {
    // updateActiveTabValues({ className: isSame ? '' : tabBadgeClassName });
    if (!hasAllEditors || !currentOperation || isSame) {
      return;
    }
    setSavedOperation({
      query: queryEditor.getValue() || '',
      variables: variableEditor.getValue() || '',
    });
  }, [queryEditor?.getValue(), variableEditor?.getValue()]);

  const shouldShowMenu = canEdit || canDelete;

  const initialSelectedCollection =
    currentOperation?.id &&
    collections.find(c => c.operations.edges.some(({ node }) => node.id === currentOperation.id))
      ?.id;

  const [createOperationState, createOperation] = useMutation(CreateOperationMutation);
  const { toast } = useToast();

  const addOperation = async (collectionId: string) => {
    const result = await createOperation({
      input: {
        collectionId,
        name: 'New Operation',
        query: '{\n  \n}',
        headers: '',
        variables: '',
      },
      selector: {
        targetSlug,
        organizationSlug,
        projectSlug,
      },
    });
    if (result.error) {
      toast({
        variant: 'destructive',
        title: "Couldn't create operation. Please try again later.",
      });
    }
    if (result.data?.createOperationInDocumentCollection.error) {
      toast({
        variant: 'destructive',
        title: result.data.createOperationInDocumentCollection.error.message,
      });
    }
    if (result.data?.createOperationInDocumentCollection.ok) {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug/laboratory',
        params: {
          organizationSlug,
          projectSlug,
          targetSlug,
        },
        search: {
          operation: result.data.createOperationInDocumentCollection.ok.operation.id,
        },
      });
    }
  };

  useEffect(() => {
    if (!initialSelectedCollection || isScrolled) return;

    setAccordionValue([initialSelectedCollection]);
    setTimeout(() => {
      const link = document
        .getElementById(COLLECTIONS_ID)
        ?.querySelector(`a[href$="${queryParamsOperationId}"]`);

      if (link) {
        link.scrollIntoView();
        setIsScrolled(true);
      }
    }, 150);
  }, [initialSelectedCollection]);

  const renderedCollections = collections.map(collection => ({
    value: collection.id,
    label: (
      <span className={operationCollectionsPluginStyles.collection}>
        {accordionValue.includes(collection.id) ? (
          <FolderOpenIcon className={operationCollectionsPluginStyles.icon} />
        ) : (
          <FolderIcon className={operationCollectionsPluginStyles.icon} />
        )}
        {collection.name}
      </span>
    ),
    attrs: { 'data-testid': 'collection-item' },
    triggerAttrs: { 'data-testid': 'collection-item-trigger' },
    action: shouldShowMenu ? (
      <Menu
        align="end"
        trigger={
          <button
            type="button"
            aria-label="More"
            className="graphiql-toolbar-button"
            data-testid="collection-menu-trigger"
          >
            <EllipsisIcon className={operationCollectionsPluginStyles.icon} />
          </button>
        }
        sections={[
          [
            {
              label: 'Add operation',
              trailingIcon: PlusIcon,
              onClick: () => void addOperation(collection.id),
              disabled: createOperationState.fetching,
              attrs: { 'data-testid': 'add-operation-to-collection' },
            },
          ],
          [
            {
              label: 'Edit',
              onClick: () => {
                setCollectionId(collection.id);
                toggleCollectionModal();
              },
              attrs: { 'data-testid': 'edit-collection' },
            },
            {
              label: 'Delete',
              variant: 'destructiveAction',
              onClick: () => {
                setCollectionId(collection.id);
                toggleDeleteCollectionModalOpen();
              },
              attrs: { 'data-testid': 'delete-collection' },
            },
          ],
        ]}
      />
    ) : undefined,
    content: (
      <div className={operationCollectionsPluginStyles.operations}>
        {collection.operations.edges.length ? (
          collection.operations.edges.map(({ node }) => (
            <div key={node.id} className={shared.row.base}>
              <Link
                to="/$organizationSlug/$projectSlug/$targetSlug/laboratory"
                params={{
                  organizationSlug,
                  projectSlug,
                  targetSlug,
                }}
                search={{ operation: node.id }}
                data-testid={`operation-${node.name}`}
                className={cn(
                  operationCollectionsPluginStyles.operation({
                    active: node.id === queryParamsOperationId,
                    changed:
                      node.id === queryParamsOperationId &&
                      currentOperation?.id === node.id &&
                      !isSame,
                  }),
                  node.id === queryParamsOperationId && 'hive-badge-is-changed',
                )}
              >
                <SquareTerminalIcon className={operationCollectionsPluginStyles.icon} />
                {node.name}
              </Link>
              <Menu
                modal={false}
                align="end"
                trigger={
                  <button
                    type="button"
                    className={cn(
                      operationCollectionsPluginStyles.operationMenu,
                      'graphiql-toolbar-button',
                    )}
                  >
                    <EllipsisIcon className={operationCollectionsPluginStyles.icon} />
                  </button>
                }
                sections={[
                  [
                    {
                      label: 'Copy link to operation',
                      onClick: async () => {
                        const url = new URL(window.location.href);
                        await copyToClipboard(`${url.origin}${url.pathname}?operation=${node.id}`);
                      },
                      attrs: { 'data-testid': 'copy-operation-link' },
                    },
                  ],
                  [
                    canEdit && {
                      label: 'Edit',
                      onClick: () => setOperationToEditId(node.id),
                      attrs: { 'data-testid': 'edit-operation' },
                    },
                    canDelete && {
                      label: 'Delete',
                      variant: 'destructiveAction' as const,
                      onClick: () => {
                        setOperationToDeleteId(node.id);
                        toggleDeleteOperationModalOpen();
                      },
                      attrs: { 'data-testid': 'delete-operation' },
                    },
                  ],
                ]}
              />
            </div>
          ))
        ) : (
          <div className={shared.textCenter}>
            <Button variant="link" onClick={() => void addOperation(collection.id)}>
              <PlusIcon className={operationCollectionsPluginStyles.addIcon} /> Add Operation
            </Button>
          </div>
        )}
      </div>
    ),
  }));

  const target = query.data?.target;

  return (
    <>
      <div className={operationCollectionsPluginStyles.header}>
        <div className="graphiql-doc-explorer-title">Operations</div>
        {target?.viewerCanModifyLaboratory && (
          // The flex item needs min-w-0 for the label inside to truncate; the button fills it.
          <span className={operationCollectionsPluginStyles.headerTitle}>
            <Tooltip
              trigger={
                <Button
                  variant="link"
                  width="full"
                  data-testid="new-collection"
                  onClick={() => {
                    if (collectionId) {
                      setCollectionId('');
                    }
                    toggleCollectionModal();
                  }}
                >
                  <span className={operationCollectionsPluginStyles.newCollection}>
                    <PlusIcon className={operationCollectionsPluginStyles.newCollectionIcon} />
                    <span className={shared.truncate}>New collection</span>
                  </span>
                </Button>
              }
              content="Create a new collection of GraphQL Operations"
            />
          </span>
        )}
      </div>
      {loading ? (
        <div
          role="status"
          aria-label="Loading collections"
          className={operationCollectionsPluginStyles.skeleton}
        >
          <span className={shared.srOnly}>Loading collections</span>
          {[0, 1, 2].map(index => (
            <Skeleton key={index} variants={{ width: 'full' }} />
          ))}
        </div>
      ) : collections.length ? (
        <Accordion
          variant="plain"
          chevron="none"
          multiple
          value={accordionValue}
          onValueChange={setAccordionValue}
          items={renderedCollections}
          attrs={{ id: COLLECTIONS_ID }}
        />
      ) : (
        <div className={operationCollectionsPluginStyles.empty}>
          <div className={operationCollectionsPluginStyles.emptyBody}>
            <BookmarkIcon size={30} />
            <div className={operationCollectionsPluginStyles.emptyText}>
              There are no collections available.
            </div>
            {canEdit && (
              <div className={operationCollectionsPluginStyles.emptyAction}>
                <Button
                  onClick={() => {
                    if (collectionId) {
                      setCollectionId('');
                    }
                    toggleCollectionModal();
                  }}
                  data-testid="create-collection"
                >
                  Create your first Collection.
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      <CreateCollectionModal
        isOpen={isCollectionModalOpen}
        toggleModalOpen={toggleCollectionModal}
        collectionId={collectionId}
      />
      <DeleteCollectionModal
        isOpen={isDeleteCollectionModalOpen}
        toggleModalOpen={toggleDeleteCollectionModalOpen}
        collectionId={collectionId}
      />
      {operationToDeleteId && (
        <DeleteOperationModal
          isOpen={isDeleteOperationModalOpen}
          toggleModalOpen={toggleDeleteOperationModalOpen}
          operationId={operationToDeleteId}
        />
      )}
      {operationToEditId && (
        <EditOperationModal
          operationId={operationToEditId}
          close={() => setOperationToEditId(null)}
        />
      )}
    </>
  );
}
