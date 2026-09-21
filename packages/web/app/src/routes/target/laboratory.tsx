import { useLocalStorage } from '@/lib/hooks';
import { TargetLaboratoryPage } from '@/pages/target-laboratory';
import { TargetLaboratoryPage as TargetLaboratoryPageNew } from '@/pages/target-laboratory-new';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

export const targetLaboratoryRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'laboratory',
  validateSearch: () => ({}) as { operation?: string; operationString?: string },
  component: function TargetLaboratoryRoute() {
    const [laboratoryTab, setLaboratoryTab] = useLocalStorage(
      'hive:laboratory:type',
      'hive-laboratory',
    );

    const { organizationSlug, projectSlug, targetSlug } = targetLaboratoryRoute.useParams();
    const { operation } = targetLaboratoryRoute.useSearch();

    if (laboratoryTab === 'hive-laboratory') {
      return (
        <TargetLaboratoryPageNew
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
          selectedOperationId={operation}
          defaultLaboratoryTab={laboratoryTab as 'graphiql' | 'hive-laboratory'}
          onLaboratoryTabChange={setLaboratoryTab}
        />
      );
    }

    return (
      <TargetLaboratoryPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        selectedOperationId={operation}
        defaultLaboratoryTab={laboratoryTab as 'graphiql' | 'hive-laboratory'}
        onLaboratoryTabChange={setLaboratoryTab}
      />
    );
  },
});
