import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/retcons")({
  component: () => (
    <EntityPage type="retcon" title="Retcons"
      subtitle="Track canon changes over time."
      extraFields={[
        { key: "oldCanon", label: "Old Canon", textarea: true },
        { key: "newCanon", label: "New Canon", textarea: true },
        { key: "reason", label: "Reason for Change", textarea: true },
        { key: "dateChanged", label: "Date Changed" },
      ]}
    />
  ),
});
