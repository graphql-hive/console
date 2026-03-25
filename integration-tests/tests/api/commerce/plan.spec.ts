import { initSeed } from '../../../testkit/seed';

test.concurrent(
  'should not allow HOBBY organization to use updateOrgRateLimit mutation',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { updateOrgRateLimit, overrideOrgPlan } = await createOrg();

    await expect(updateOrgRateLimit(50000000)).rejects.toThrowError(
      'Only PRO organizations can update rate limits via API',
    );
  },
);

test.concurrent(
  'should not allow ENTERPRISE organization to use updateOrgRateLimit mutation',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { updateOrgRateLimit, overrideOrgPlan } = await createOrg();
    await overrideOrgPlan('ENTERPRISE');

    await expect(updateOrgRateLimit(50000000)).rejects.toThrowError(
      'Only PRO organizations can update rate limits via API',
    );
  },
);

test.concurrent(
  'should only allow PRO organization to use updateOrgRateLimit mutation',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { overrideOrgPlan, updateOrgRateLimit } = await createOrg();

    await overrideOrgPlan('PRO');
    // Not throwing - should succeed
    await updateOrgRateLimit(50000000);
  },
);
