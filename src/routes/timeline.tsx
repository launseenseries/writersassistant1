import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/EntityPage";

export const Route = createFileRoute("/timeline")({
  component: () => (
    <EntityPage
      type="timeline"
      title="Timeline"
      subtitle="Events sort chronologically. Undated events are flagged for placement."
      extraFields={[
        { key: "exactDate", label: "Exact Date (YYYY-MM-DD)" },
        { key: "approxLabel", label: "Approximate Date Label" },
        { key: "storyTime", label: "Time" },
        { key: "chapter", label: "Chapter" },
        { key: "scene", label: "Scene" },
      ]}
      filterFn={(i) => true}
      renderExtra={(item) => {
        const d = item.data as any;
        return (
          <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
            {d?.exactDate && <span>📅 {d.exactDate}</span>}
            {d?.approxLabel && <span>~ {d.approxLabel}</span>}
            {d?.chapter && <span>Ch {d.chapter}</span>}
            {d?.needsReview && <span className="text-yellow-300">⚠ Needs Review</span>}
            {!d?.exactDate && !d?.approxLabel && <span className="text-yellow-300">Undated / Needs Placement</span>}
          </div>
        );
      }}
    />
  ),
});
