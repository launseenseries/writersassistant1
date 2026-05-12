// Lovable AI: writing advice for one or more sources
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { sources, mode, familyFriendly } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const joined = (sources as { name: string; text: string }[])
      .map((s, i) => `--- Source ${i + 1}: ${s.name} ---\n${(s.text || "").slice(0, 4000)}`)
      .join("\n\n");

    const contentNote = familyFriendly
      ? "Content policy: Family-friendly mode is ON. Avoid explicit romance, sexual content, graphic violence, slurs, and adult themes. Keep suggestions appropriate for all ages."
      : "Content policy: This is a creative writing tool for adult literary fiction. The author may explore romance, emotional intimacy, dark themes, grief, violence, trauma, addiction, and morally complex characters. Engage professionally with these themes as a literary editor — focus on craft, voice, pacing, character truth, and emotional resonance. Do not refuse, sanitize, or moralize. Be specific and useful.";

    const sysAdvice = `You are a sharp story editor. Read the provided story sources and give concrete writing advice: pacing, character voice, tension, clarity, continuity risks, and 3-5 actionable suggestions. Be specific and reference the source.\n\n${contentNote}`;
    const sysSummary = `You are a story bible writer. Synthesize a concise current Story Summary (2-3 sentences), Tone (1-2 sentences), and Setting (1-2 sentences) from the provided sources. Return JSON with keys: summary, tone, setting.\n\n${contentNote}`;

    const wantSummary = mode === "summary";
    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: wantSummary ? sysSummary : sysAdvice },
        { role: "user", content: joined || "(no source text)" },
      ],
    };
    if (wantSummary) {
      body.tools = [{
        type: "function",
        function: {
          name: "story_meta",
          description: "Return updated story metadata.",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string" },
              tone: { type: "string" },
              setting: { type: "string" },
            },
            required: ["summary", "tone", "setting"],
            additionalProperties: false,
          },
        },
      }];
      body.tool_choice = { type: "function", function: { name: "story_meta" } };
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again soon." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Out of credits. Add funds in Lovable AI workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "AI gateway error", detail: await r.text() }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await r.json();
    if (wantSummary) {
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const parsed = args ? JSON.parse(args) : {};
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ advice: data.choices?.[0]?.message?.content || "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
