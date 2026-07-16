import { z } from 'zod';

const createMetaModel = <TResourceType extends 'User' | 'Group'>(resourceType: TResourceType) =>
  z
    .object({
      resourceType: z.literal(resourceType),
      created: z.string(),
      lastModified: z.string(),
      location: z.string(),
    })
    .strict();

const ReferenceModel = z
  .object({
    value: z.string(),
    $ref: z.string(),
    display: z.string().nullable().optional(),
  })
  .strict();

const EmailModel = z
  .object({
    primary: z.boolean(),
    value: z.string(),
    type: z.string(),
  })
  .strict();

export const SCIMUserModel = z
  .object({
    schemas: z.tuple([z.literal('urn:ietf:params:scim:schemas:core:2.0:User')]),
    id: z.string(),
    userName: z.string(),
    emails: z.array(EmailModel),
    externalId: z.string(),
    active: z.boolean(),
    groups: z.array(ReferenceModel),
    meta: createMetaModel('User'),
  })
  .strict();

export const SCIMGroupModel = z
  .object({
    schemas: z.tuple([z.literal('urn:ietf:params:scim:schemas:core:2.0:Group')]),
    id: z.string(),
    displayName: z.string(),
    externalId: z.string().optional(),
    members: z.array(ReferenceModel).optional(),
    meta: createMetaModel('Group'),
  })
  .strict();

export const SCIMErrorModel = z
  .object({
    schemas: z.tuple([z.literal('urn:ietf:params:scim:api:messages:2.0:Error')]),
    status: z.number(),
    detail: z.string(),
  })
  .strict();

const ListModel = z.object({
  schemas: z.tuple([z.literal('urn:ietf:params:scim:api:messages:2.0:ListResponse')]),
  itemsPerPage: z.number(),
  startIndex: z.number(),
  totalResults: z.number(),
});

export const SCIMUserListModel = ListModel.extend({
  Resources: z.array(SCIMUserModel),
}).strict();

export const SCIMGroupListModel = ListModel.extend({
  Resources: z.array(SCIMGroupModel),
}).strict();

type SCIMError = z.infer<typeof SCIMErrorModel>;
type SchemaOutput<TSchema extends z.ZodTypeAny | undefined> = TSchema extends z.ZodTypeAny
  ? z.output<TSchema>
  : undefined;
type ExpectedResponse<TBody, TExpectedStatus extends number, TSuccessStatus extends number> = {
  status: number;
  body: TExpectedStatus extends TSuccessStatus ? TBody : SCIMError;
  headers: Headers;
};

type ExpectedStatusOptions<TExpectedStatus extends number> = {
  expectedStatus?: TExpectedStatus;
};

export type SCIMListQuery = {
  count?: string | number;
  startIndex?: string | number;
  filter?: string;
};

export function createScimTestkit({ baseUrl, headers }: { baseUrl: string; headers: HeadersInit }) {
  const requestHeaders = new Headers(headers);

  async function request<
    TExpectedStatus extends number,
    TSuccessStatus extends number,
    TSchema extends z.ZodTypeAny | undefined = undefined,
  >({
    method,
    path,
    body,
    query,
    expectedStatus,
    successStatus,
    successSchema,
  }: {
    method: string;
    path: string;
    body?: unknown;
    query?: SCIMListQuery;
    expectedStatus: TExpectedStatus;
    successStatus: TSuccessStatus;
    successSchema?: TSchema;
  }): Promise<ExpectedResponse<SchemaOutput<TSchema>, TExpectedStatus, TSuccessStatus>> {
    const url = new URL(`/scim/v2/${path}`, baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value != null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected ${method} ${url.pathname} to return ${expectedStatus}, received ${response.status}: ${await response.text()}`,
      );
    }

    const decodedBody =
      Number(expectedStatus) === Number(successStatus)
        ? successSchema
          ? successSchema.parse(await response.json())
          : undefined
        : SCIMErrorModel.parse(await response.json());

    return {
      status: response.status,
      body: decodedBody,
      headers: response.headers,
    } as ExpectedResponse<SchemaOutput<TSchema>, TExpectedStatus, TSuccessStatus>;
  }

  return {
    createUser<TExpectedStatus extends number = 201>(
      body: unknown,
      { expectedStatus = 201 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'POST',
        path: 'Users',
        body,
        expectedStatus,
        successStatus: 201,
        successSchema: SCIMUserModel,
      });
    },
    updateUser<TExpectedStatus extends number = 200>(
      id: string,
      body: unknown,
      { expectedStatus = 200 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'PUT',
        path: `Users/${id}`,
        body,
        expectedStatus,
        successStatus: 200,
        successSchema: SCIMUserModel,
      });
    },
    patchUser<TExpectedStatus extends number = 200>(
      id: string,
      body: unknown,
      { expectedStatus = 200 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'PATCH',
        path: `Users/${id}`,
        body,
        expectedStatus,
        successStatus: 200,
        successSchema: SCIMUserModel,
      });
    },
    getUser<TExpectedStatus extends number = 200>(
      id: string,
      { expectedStatus = 200 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'GET',
        path: `Users/${id}`,
        expectedStatus,
        successStatus: 200,
        successSchema: SCIMUserModel,
      });
    },
    listUsers<TExpectedStatus extends number = 200>(
      query?: SCIMListQuery,
      { expectedStatus = 200 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'GET',
        path: 'Users',
        query,
        expectedStatus,
        successStatus: 200,
        successSchema: SCIMUserListModel,
      });
    },
    deleteUser<TExpectedStatus extends number = 204>(
      id: string,
      { expectedStatus = 204 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'DELETE',
        path: `Users/${id}`,
        expectedStatus,
        successStatus: 204,
      });
    },
    createGroup<TExpectedStatus extends number = 201>(
      body: unknown,
      { expectedStatus = 201 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'POST',
        path: 'Groups',
        body,
        expectedStatus,
        successStatus: 201,
        successSchema: SCIMGroupModel,
      });
    },
    updateGroup<TExpectedStatus extends number = 200>(
      id: string,
      body: unknown,
      { expectedStatus = 200 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'PUT',
        path: `Groups/${id}`,
        body,
        expectedStatus,
        successStatus: 200,
        successSchema: SCIMGroupModel,
      });
    },
    patchGroup<TExpectedStatus extends number = 200>(
      id: string,
      body: unknown,
      { expectedStatus = 200 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'PATCH',
        path: `Groups/${id}`,
        body,
        expectedStatus,
        successStatus: 200,
        successSchema: SCIMGroupModel,
      });
    },
    getGroup<TExpectedStatus extends number = 200>(
      id: string,
      { expectedStatus = 200 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'GET',
        path: `Groups/${id}`,
        expectedStatus,
        successStatus: 200,
        successSchema: SCIMGroupModel,
      });
    },
    listGroups<TExpectedStatus extends number = 200>(
      query?: SCIMListQuery,
      { expectedStatus = 200 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'GET',
        path: 'Groups',
        query,
        expectedStatus,
        successStatus: 200,
        successSchema: SCIMGroupListModel,
      });
    },
    deleteGroup<TExpectedStatus extends number = 204>(
      id: string,
      { expectedStatus = 204 as TExpectedStatus }: ExpectedStatusOptions<TExpectedStatus> = {},
    ) {
      return request({
        method: 'DELETE',
        path: `Groups/${id}`,
        expectedStatus,
        successStatus: 204,
      });
    },
  };
}
