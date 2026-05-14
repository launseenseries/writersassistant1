// Pick a lucide-react icon name for a custom canon category using Lovable AI
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED = [
  "Swords","Languages","Rabbit","Leaf","UtensilsCrossed","Ship","Car","Music","Mail",
  "NotebookPen","Cloud","ScrollText","Wand2","FlaskConical","Coins","Gavel","Handshake",
  "Stars","Sun","Moon","Flame","Waves","Mountain","Castle","Building2","Route","Map",
  "Key","DoorOpen","BookOpen","Stethoscope","Cpu","ShieldCheck","PartyPopper","Hourglass",
  "MessageCircle","VenetianMask","Heart","Skull","Baby","UsersRound","Tag","Gem","Compass",
  "Feather","Sparkle","Bookmark","Crown","Landmark","Globe2","Users","MapPin","Shield",
  "Sparkles","Clock","GitBranch","AlertTriangle","RotateCcw","FileText","Library","Star",
  "Eye","Drama","Bird","Fish","Trees","Anchor","Telescope","Microscope","Dna","Atom",
  "Pill","Bone","Pickaxe","Hammer","Wrench","Scroll","Quote","Crosshair","Target","Trophy",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return new Response(JSON.stringify({ error: "name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You pick the single best lucide-react icon for a story-canon category name. Choose ONE icon name from the provided allowlist that best evokes the category." },
          { role: "user", content: `Category: "${name}"\n\nAllowed icons: ${ALLOWED.join(", ")}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "pick_icon",
            description: "Return the chosen lucide icon name.",
            parameters: {
              type: "object",
              properties: { icon: { type: "string", enum: ALLOWED } },
              required: ["icon"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "pick_icon" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Add credits in Settings → Workspace → Usage" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("ai gateway", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await resp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let icon = "Tag";
    try { icon = JSON.parse(args || "{}").icon || "Tag"; } catch { /* default */ }
    if (!ALLOWED.includes(icon)) icon = "Tag";
    return new Response(JSON.stringify({ icon }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
