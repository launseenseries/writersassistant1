import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/heritage")({
  component: () => (
    <EntityPage type="heritage" title="Heritage"
      subtitle="Cultural background, traditions, language, and identity."
      extraFields={[
        { key: "background", label: "Cultural Background", textarea: true },
        { key: "traditions", label: "Traditions", textarea: true },
        { key: "language", label: "Language / Terms" },
        { key: "faithConnections", label: "Faith Connections" },
        { key: "storyRelevance", label: "Story Relevance", textarea: true },
      ]}
    />
  ),
});
