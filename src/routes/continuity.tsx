import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/continuity")({
  component: () => (
    <EntityPage type="continuity" title="Continuity Issues"
      subtitle="Possible contradictions across your canon."
      extraFields={[
        { key: "severity", label: "Severity (low/medium/high)" },
        { key: "status", label: "Status (Unresolved/Resolved/Intentional/Ignored/Needs Review)" },
        { key: "suggestedFix", label: "Suggested Fix", textarea: true },
      ]}
    />
  ),
});
