/** Common useful operations  */
import { graphql } from 'testkit/gql';
import {
  ApproveProposalMutationVariables,
  CheckSchemaMutationVariables,
  ReadProposalQueryVariables,
} from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';

export const CreateProposalMutation = graphql(`
  mutation CreateProposal($input: CreateSchemaProposalInput!) {
    createSchemaProposal(input: $input) {
      ok {
        schemaProposal {
          id
        }
      }
      error {
        message
      }
    }
  }
`);

export const ReadProposalQuery = graphql(`
  query ReadProposal($input: SchemaProposalInput!) {
    schemaProposal(input: $input) {
      title
      description
      checks(input: { latestPerService: true }) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`);

export const CheckSchemaMutation = graphql(`
  mutation CheckSchema($input: SchemaCheckInput!) {
    schemaCheck(input: $input) {
      ... on SchemaCheckSuccess {
        __typename
        valid
        changes {
          nodes {
            message
            criticality
          }
          total
        }
        schemaCheck {
          id
        }
      }
      ... on SchemaCheckError {
        __typename
        valid
        changes {
          nodes {
            message
            criticality
          }
          total
        }
        errors {
          nodes {
            message
          }
          total
        }
        schemaCheck {
          id
        }
      }
    }
  }
`);

export const ApproveProposalMutation = graphql(`
  mutation ApproveProposal($proposalId: ID!, $service: String! = "") {
    reviewSchemaProposal(
      input: { schemaProposalId: $proposalId, serviceName: $service, stageTransition: APPROVED }
    ) {
      ok {
        __typename
      }
      error {
        message
      }
    }
  }
`);

export function readProposal({
  accessKey,
  ...vars
}: ReadProposalQueryVariables & { accessKey: string }) {
  return execute({
    document: ReadProposalQuery,
    variables: vars,
    token: accessKey,
  });
}

/** Requires schemaProposal:modify, schemaProposal:describe, project:describe, and schemaCheck:create */
export function checkSchema({
  accessKey,
  ...vars
}: CheckSchemaMutationVariables & { accessKey: string }) {
  return execute({
    document: CheckSchemaMutation,
    variables: vars,
    token: accessKey,
  });
}

export function approveProposal({
  accessKey,
  ...vars
}: ApproveProposalMutationVariables & { accessKey: string }) {
  return execute({
    document: ApproveProposalMutation,
    variables: vars,
    token: accessKey,
  });
}
