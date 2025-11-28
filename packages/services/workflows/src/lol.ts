import { queueWorkflow } from './workflows.js';
import { UserOnboardingWorkflow } from './workflows/user-onboarding.js';

queueWorkflow(UserOnboardingWorkflow, {
  organizationId: 'abc',
  userId: 'xyz',
});
