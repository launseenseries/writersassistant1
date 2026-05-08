import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/worldbuilding")({
  component: () => (
    <EntityPage type="worldbuilding" title="Worldbuilding Guide"
      subtitle="Cultural rules, social systems, technology, history, objects, vocabulary, conflicts, and open questions."
      extraFields={[
        { key: "category", label: "Sub-category (e.g. Cultural Rule, Object)" },
        { key: "fullNotes", label: "Full Notes", textarea: true },
      ]}
    />
  ),
});
