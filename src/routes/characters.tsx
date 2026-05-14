import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EntityPage } from "@/components/EntityPage";
import { Button } from "@/components/ui/button";
import { NpcRandomizer } from "@/components/NpcRandomizer";
import { Dice5 } from "lucide-react";

function CharactersPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
          <Dice5 className="w-4 h-4 text-primary" />
          Randomize NPC
        </Button>
      </div>
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
      <NpcRandomizer open={open} onOpenChange={setOpen} />
    </div>
  );
}

export const Route = createFileRoute("/characters")({ component: CharactersPage });
