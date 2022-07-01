import { parse, buildSchema } from 'graphql';
// eslint-disable-next-line import/no-extraneous-dependencies
import nock from 'nock';
import { createHive } from '../src/client';
import { version } from '../src/version';
import { waitFor } from './test-utils';
import type { Report } from '../src/internal/usage';

const headers = {
  'Content-Type': 'application/json',
  'graphql-client-name': 'Hive Client',
  'graphql-client-version': version,
};

const schema = buildSchema(/* GraphQL */ `
  type Query {
    project(selector: ProjectSelectorInput!): Project
    projectsByType(type: ProjectType!): [Project!]!
    projects(filter: FilterInput): [Project!]!
  }

  type Mutation {
    deleteProject(selector: ProjectSelectorInput!): DeleteProjectPayload!
  }

  input ProjectSelectorInput {
    organization: ID!
    project: ID!
  }

  input FilterInput {
    type: ProjectType
    pagination: PaginationInput
  }

  input PaginationInput {
    limit: Int
    offset: Int
  }

  type ProjectSelector {
    organization: ID!
    project: ID!
  }

  type DeleteProjectPayload {
    selector: ProjectSelector!
    deletedProject: Project!
  }

  type Project {
    id: ID!
    cleanId: ID!
    name: String!
    type: ProjectType!
    buildUrl: String
    validationUrl: String
  }

  enum ProjectType {
    FEDERATION
    STITCHING
    SINGLE
    CUSTOM
  }
`);

const op = parse(/* GraphQL */ `
  mutation deleteProject($selector: ProjectSelectorInput!) {
    deleteProject(selector: $selector) {
      selector {
        organization
        project
      }
      deletedProject {
        ...ProjectFields
      }
    }
  }

  fragment ProjectFields on Project {
    id
    cleanId
    name
    type
  }
`);

beforeEach(() => {
  jest.restoreAllMocks();
});

afterEach(() => {
  nock.cleanAll();
});

test('should send data to Hive', async () => {
  const logger = {
    error: jest.fn(),
    info: jest.fn(),
  };

  const token = 'Token';

  let report: Report = {
    size: 0,
    map: {},
    operations: [],
  };
  const http = nock('http://localhost')
    .post('/200')
    .matchHeader('Authorization', `Bearer ${token}`)
    .matchHeader('Content-Type', headers['Content-Type'])
    .matchHeader('graphql-client-name', headers['graphql-client-name'])
    .matchHeader('graphql-client-version', headers['graphql-client-version'])
    .once()
    .reply((_, _body) => {
      report = _body as any;
      return [200];
    });

  const hive = createHive({
    enabled: true,
    debug: true,
    agent: {
      timeout: 500,
      maxRetries: 0,
      logger,
    },
    token,
    usage: {
      endpoint: 'http://localhost/200',
    },
  });

  const collect = hive.collectUsage({
    schema,
    document: op,
    operationName: 'deleteProject',
  });

  await waitFor(2000);
  collect({});
  await hive.dispose();
  await waitFor(1000);
  http.done();

  expect(logger.error).not.toHaveBeenCalled();
  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sending (queue 1) (attempt 1)`);
  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sent!`);

  // Map
  expect(report.size).toEqual(1);
  expect(Object.keys(report.map)).toHaveLength(1);

  const key = Object.keys(report.map)[0];
  const record = report.map[key];

  // operation
  expect(record.operation).toMatch('mutation deleteProject');
  expect(record.operationName).toMatch('deleteProject');
  // fields
  expect(record.fields).toHaveLength(13);
  expect(record.fields).toContainEqual('Mutation.deleteProject');
  expect(record.fields).toContainEqual('Mutation.deleteProject.selector');
  expect(record.fields).toContainEqual('DeleteProjectPayload.selector');
  expect(record.fields).toContainEqual('ProjectSelector.organization');
  expect(record.fields).toContainEqual('ProjectSelector.project');
  expect(record.fields).toContainEqual('DeleteProjectPayload.deletedProject');
  expect(record.fields).toContainEqual('Project.id');
  expect(record.fields).toContainEqual('Project.cleanId');
  expect(record.fields).toContainEqual('Project.name');
  expect(record.fields).toContainEqual('Project.type');
  expect(record.fields).toContainEqual('ProjectSelectorInput.organization');
  expect(record.fields).toContainEqual('ID');
  expect(record.fields).toContainEqual('ProjectSelectorInput.project');

  // Operations
  const operations = report.operations;
  expect(operations).toHaveLength(1); // one operation
  const operation = operations[0];

  expect(operation.operationMapKey).toEqual(key);
  expect(operation.timestamp).toEqual(expect.any(Number));
  // execution
  expect(operation.execution.duration).toBeGreaterThanOrEqual(2000 * 1_000_000); // >=2000ms in microseconds
  expect(operation.execution.duration).toBeLessThan(3000 * 1_000_000); // <3000ms
  expect(operation.execution.errorsTotal).toBe(0);
  expect(operation.execution.errors).toHaveLength(0);
  expect(operation.execution.ok).toBe(true);
});

test('should not leak the exception', async () => {
  const logger = {
    error: jest.fn(),
    info: jest.fn(),
  };

  const hive = createHive({
    enabled: true,
    debug: true,
    agent: {
      timeout: 500,
      maxRetries: 1,
      logger,
    },
    token: 'Token',
    usage: {
      endpoint: 'http://404.localhost',
    },
  });

  hive.collectUsage({
    schema,
    document: op,
    operationName: 'deleteProject',
  })({});

  await waitFor(1000);
  await hive.dispose();

  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sending (queue 1) (attempt 1)`);
  expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`[hive][usage] Attempt 1 failed:`));
  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sending (queue 1) (attempt 2)`);
  expect(logger.error).toHaveBeenCalledTimes(1);
  expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`[hive][usage] Failed to send data`));
});

test('sendImmediately should not stop the schedule', async () => {
  const logger = {
    error: jest.fn(),
    info: jest.fn(),
  };

  const token = 'Token';

  const http = nock('http://localhost')
    .post('/200')
    .matchHeader('authorization', `Bearer ${token}`)
    .matchHeader('Content-Type', headers['Content-Type'])
    .matchHeader('graphql-client-name', headers['graphql-client-name'])
    .matchHeader('graphql-client-version', headers['graphql-client-version'])
    .times(3)
    .reply((_, _body) => {
      return [200];
    });

  const hive = createHive({
    enabled: true,
    debug: true,
    agent: {
      timeout: 500,
      maxRetries: 0,
      maxSize: 2,
      logger,
      sendInterval: 100,
    },
    token,
    usage: {
      endpoint: 'http://localhost/200',
    },
  });

  const collect = hive.collectUsage({
    schema,
    document: op,
    operationName: 'deleteProject',
  });

  expect(logger.info).toHaveBeenCalledTimes(0);

  collect({});
  await waitFor(200);
  // Because maxSize is 2 and sendInterval is 100ms
  // the scheduled send task should be done by now
  expect(logger.error).not.toHaveBeenCalled();
  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sending (queue 1) (attempt 1)`);
  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sent!`);
  expect(logger.info).not.toHaveBeenCalledWith(`[hive][usage] Sending immediately`);
  expect(logger.info).toHaveBeenCalledTimes(2);

  // Now we will check the maxSize
  // We run collect three times
  collect({});
  collect({});
  expect(logger.error).not.toHaveBeenCalled();
  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sending (queue 1) (attempt 1)`);
  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sending immediately`);
  await waitFor(1); // we run setImmediate under the hood
  // It should be sent already
  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sent!`);
  expect(logger.info).toHaveBeenCalledTimes(4);

  await waitFor(50);
  expect(logger.info).toHaveBeenCalledTimes(5);

  // Let's check if the scheduled send task is still running
  collect({});
  await waitFor(200);
  expect(logger.error).not.toHaveBeenCalled();
  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sending (queue 1) (attempt 1)`);
  expect(logger.info).toHaveBeenCalledWith(`[hive][usage] Sent!`);
  expect(logger.info).toHaveBeenCalledTimes(7);

  await hive.dispose();
  await waitFor(1000);
  http.done();
});
