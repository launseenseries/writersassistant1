import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/faith")({
  component: () => (
    <EntityPage type="faith" title="Faith"
      subtitle="Beliefs, practices, cultural rules, and important objects."
      extraFields={[
        { key: "beliefs", label: "Beliefs / Practices", textarea: true },
        { key: "culturalRules", label: "Cultural Rules", textarea: true },
        { key: "objects", label: "Important Objects" },
      ]}
    />
  ),
});
