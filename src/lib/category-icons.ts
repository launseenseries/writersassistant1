import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";

const KEYWORDS: Array<[RegExp, keyof typeof Lucide]> = [
  [/artifact|relic|object|item|weapon|sword|tool/i, "Swords"],
  [/language|tongue|dialect|word|lexicon/i, "Languages"],
  [/creature|beast|monster|animal|fauna/i, "Rabbit"],
  [/plant|herb|flora|tree|garden/i, "Leaf"],
  [/food|drink|cuisine|meal|recipe/i, "UtensilsCrossed"],
  [/ship|vessel|boat|fleet|naval/i, "Ship"],
  [/vehicle|car|cart|transport/i, "Car"],
  [/song|music|bard|melody/i, "Music"],
  [/letter|epistle|message|correspondence/i, "Mail"],
  [/note|journal|diary|memo/i, "NotebookPen"],
  [/dream|vision|prophecy|omen/i, "Cloud"],
  [/myth|legend|tale|story/i, "ScrollText"],
  [/spell|ritual|incantation|enchant/i, "Wand2"],
  [/potion|elixir|alchemy/i, "FlaskConical"],
  [/coin|currency|economy|trade|gold|wealth/i, "Coins"],
  [/law|rule|decree|edict|policy/i, "Gavel"],
  [/oath|vow|pact|contract|treaty/i, "Handshake"],
  [/star|cosmos|astro|celestial|sky/i, "Stars"],
  [/sun|day|dawn/i, "Sun"],
  [/moon|night|nocturne/i, "Moon"],
  [/fire|flame|ember/i, "Flame"],
  [/water|ocean|river|sea/i, "Waves"],
  [/mountain|peak|cliff/i, "Mountain"],
  [/castle|fortress|keep|tower/i, "Castle"],
  [/city|town|village|settlement/i, "Building2"],
  [/road|path|route|journey/i, "Route"],
  [/map|atlas|cartograph/i, "Map"],
  [/key|lock|cipher|secret/i, "Key"],
  [/door|gate|portal/i, "DoorOpen"],
  [/book|tome|grimoire|codex/i, "BookOpen"],
  [/army|war|battle|military|legion/i, "Swords"],
  [/medicine|healer|cure|disease|plague/i, "Stethoscope"],
  [/tech|machine|device|invention/i, "Cpu"],
  [/symbol|sigil|emblem|crest|banner/i, "ShieldCheck"],
  [/holiday|festival|ceremony|ritual/i, "PartyPopper"],
  [/era|age|epoch|period/i, "Hourglass"],
  [/rumor|gossip|whisper/i, "MessageCircle"],
  [/crime|thief|guild|underworld/i, "Mask"],
  [/love|romance|lover|courtship/i, "Heart"],
  [/death|grave|tomb|funeral/i, "Skull"],
  [/birth|child|heir|lineage/i, "Baby"],
  [/race|species|kin/i, "UsersRound"],
];

export function pickCategoryIcon(name: string): LucideIcon {
  const n = (name || "").trim();
  for (const [re, key] of KEYWORDS) {
    if (re.test(n)) {
      const ico = (Lucide as any)[key];
      if (ico) return ico as LucideIcon;
    }
  }
  // deterministic fallback based on name length
  const fallback = ["Tag", "Gem", "Compass", "Feather", "Sparkle", "Bookmark"] as const;
  const pick = fallback[n.length % fallback.length];
  return ((Lucide as any)[pick] || Lucide.Tag) as LucideIcon;
}
