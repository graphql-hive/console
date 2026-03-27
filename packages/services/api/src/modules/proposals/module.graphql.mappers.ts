export type SchemaProposalChangeDetailsMapper =
  | {
      schemaProposal: { id: string };
      implementedBy?: { id: string } | null;
    }
  | null
  | undefined;
