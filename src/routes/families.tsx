import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/families")({
  component: () => (
    <EntityPage type="family" title="Families"
      subtitle="Lineage, heritage, faith, reputation, and traits."
      extraFields={[
        { key: "members", label: "Members" },
        { key: "lineage", label: "Lineage", textarea: true },
        { key: "heritage", label: "Heritage" },
        { key: "faith", label: "Faith" },
        { key: "reputation", label: "Reputation" },
        { key: "powers", label: "Powers / Traits" },
        { key: "keyEvents", label: "Key Events", textarea: true },
      ]}
    />
  ),
});
