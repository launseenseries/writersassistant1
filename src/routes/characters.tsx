import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/characters")({
  component: () => (
    <EntityPage
      type="character"
      title="Characters"
      subtitle="Profiles, arcs, relationships, powers, heritage, and faith."
      extraFields={[
        { key: "aliases", label: "Aliases" },
        { key: "age", label: "Age" },
        { key: "birthdate", label: "Birthdate" },
        { key: "appearance", label: "Appearance", textarea: true },
        { key: "personality", label: "Personality", textarea: true },
        { key: "powers", label: "Powers / Skills" },
        { key: "family", label: "Family" },
        { key: "heritage", label: "Heritage" },
        { key: "faith", label: "Faith" },
        { key: "affiliations", label: "Affiliations / Factions" },
        { key: "arc", label: "Character Arc", textarea: true },
        { key: "openQuestions", label: "Open Questions", textarea: true },
      ]}
    />
  ),
});
