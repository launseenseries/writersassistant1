import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/factions")({
  component: () => (
    <EntityPage type="faction" title="Factions"
      subtitle="Organizations, schools, councils, enforcement, guilds."
      extraFields={[
        { key: "type", label: "Type" },
        { key: "purpose", label: "Purpose", textarea: true },
        { key: "leadership", label: "Leadership" },
        { key: "members", label: "Members" },
        { key: "rules", label: "Rules", textarea: true },
        { key: "conflicts", label: "Conflicts", textarea: true },
      ]}
    />
  ),
});
