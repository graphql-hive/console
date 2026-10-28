import { ProjectType } from 'testkit/gql/graphql';
import { initSeed } from '../../../testkit/seed';

describe('Preflight Script', () => {
  describe('CRUD', () => {
    const rawJs = 'console.log("Hello World")';

    it.concurrent('Update a Preflight Script', async () => {
      const { updatePreflightScript } = await initSeed()
        .createOwner()
        .then(r => r.createOrg())
        .then(r => r.createProject(ProjectType.Single));

      const { error, ok } = await updatePreflightScript({ sourceCode: rawJs });
      expect(error).toEqual(null);
      expect(ok?.updatedTarget.preflightScript?.id).toBeDefined();
      expect(ok?.updatedTarget.preflightScript?.sourceCode).toBe(rawJs);
    });

    describe('Permissions Check', () => {
      it('Prevent updating a Preflight Script without the write permission to the target', async () => {
        const { updatePreflightScript, createTargetAccessToken } = await initSeed()
          .createOwner()
          .then(r => r.createOrg())
          .then(r => r.createProject(ProjectType.Single));

        const { secret: readOnlyToken } = await createTargetAccessToken({ mode: 'readOnly' });

        await expect(
          updatePreflightScript({ sourceCode: rawJs, token: readOnlyToken }),
        ).rejects.toEqual(
          expect.objectContaining({
            message: expect.stringContaining(
              `No access (reason: "Missing permission for performing 'laboratory:modifyPreflightScript' on resource")`,
            ),
          }),
        );
      });
    });
  });

  describe('Validation', () => {
    test.concurrent('Mutation.updatePreflightScript: source code too long', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { updatePreflightScript } = await createProject(ProjectType.Single);

      const result = await updatePreflightScript({ sourceCode: 'a'.repeat(5_001) });

      expect(result.error).toMatchInlineSnapshot(`
        {
          message: Source code must be less than 5000 characters,
        }
      `);
    });
  });
});
