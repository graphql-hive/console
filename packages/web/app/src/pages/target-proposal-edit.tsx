export function TargetProposalEditPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
}) {
  console.log('@todo ', props);
  return (
    <div className="w-full p-4 text-center">
      Edit is not available yet. Use <span className="text-orange-500">@graphql-hive/cli</span> to
      propose changes.
    </div>
  );
}
