import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/magic")({
  component: () => (
    <EntityPage type="magic" title="Magic / Power System"
      subtitle="Rules, limits, training methods, risks, and known users."
      extraFields={[
        { key: "type", label: "Type" },
        { key: "rules", label: "Rules", textarea: true },
        { key: "limits", label: "Limits", textarea: true },
        { key: "training", label: "Training Methods", textarea: true },
        { key: "risks", label: "Risks" },
        { key: "knownUsers", label: "Known Users" },
      ]}
    />
  ),
});
