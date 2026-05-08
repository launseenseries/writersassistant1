import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/locations")({
  component: () => (
    <EntityPage type="location" title="Locations"
      subtitle="Cities, neighborhoods, schools, landmarks."
      extraFields={[
        { key: "type", label: "Type" },
        { key: "region", label: "Neighborhood / City / Region" },
        { key: "significance", label: "Cultural Significance", textarea: true },
      ]}
    />
  ),
});
