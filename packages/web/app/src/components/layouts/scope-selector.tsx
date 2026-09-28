import { useParams } from '@tanstack/react-router';
import { OrganizationSelector } from './organization-selectors';
import { ProjectSelector } from './project-selector';
import { TargetSelector } from './target-selector';

/** The selector for whichever level the URL is on. */
export function ScopeSelector() {
  const { organizationSlug, projectSlug, targetSlug } = useParams({ strict: false });
  if (!organizationSlug) {
    return null;
  }
  if (projectSlug && targetSlug) {
    return (
      <TargetSelector
        currentOrganizationSlug={organizationSlug}
        currentProjectSlug={projectSlug}
        currentTargetSlug={targetSlug}
      />
    );
  }
  if (projectSlug) {
    return (
      <ProjectSelector
        currentOrganizationSlug={organizationSlug}
        currentProjectSlug={projectSlug}
      />
    );
  }
  return <OrganizationSelector currentOrganizationSlug={organizationSlug} />;
}
