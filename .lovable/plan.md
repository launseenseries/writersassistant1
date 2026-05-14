## Plan: Sidebar +, Mobile Nav, Project Creation, NPC Randomizer, Editable Templates

### 1. Sidebar "+" next to Story Canon (with AI icon)
**File:** `src/components/Sidebar.tsx`
- Add a `+` button inline with the "Story Canon" group label.
- Clicking opens a small inline input (or `Dialog`) for category name.
- On submit:
  - Call new edge function `category-icon` (Lovable AI, `google/gemini-3-flash-preview`, tool-calling) that returns the best matching `lucide-react` icon name from a curated allowlist based on the category name.
  - Save via `useCategories.add(projectId, name, iconName)`.
  - Fall back to local `pickCategoryIcon` heuristic if AI call fails.
- Update `pickCategoryIcon` usage to prefer the stored `c.icon` (lucide name) when present, else fall back to keyword match.

**New file:** `supabase/functions/category-icon/index.ts`
- Accepts `{ name: string }`, returns `{ icon: string }` (validated against allowlist of ~80 lucide icon names).
- Uses tool calling for structured output; handles 429/402.
- Register in `supabase/config.toml` with `verify_jwt = false`.

### 2. Mobile hamburger nav
Already implemented in `src/routes/__root.tsx` per prior turn. Verify:
- Hamburger visible `lg:hidden` at top-left.
- `Sheet` opens full `<Sidebar variant="mobile" onNavigate={close} />`.
- No regressions on viewport `1051px` (just below `lg` breakpoint 1024 — confirmed `lg:` triggers correctly).
- If header is missing the trigger, restore.

### 3. "New Project" in top-right project selector dropdown
**File:** `src/components/ProjectSwitcher.tsx` (read first to confirm structure)
- Add a sticky footer item `+ New Project` inside the dropdown.
- Click → opens a small `Dialog` with fields: title (required), genre, setting summary.
- Calls `useStore.createProject(...)` then `setCurrentProject(newId)`.
- Toast confirmation; close dropdown.

### 4. AI NPC Randomizer (Characters page)
**File:** `src/routes/characters.tsx` + new `src/components/NpcRandomizer.tsx`
- Add a "Randomize NPC" button at the top of the Characters page (next to existing Add).
- Opens a `Dialog` with:
  - Multi-select of which NPC fields to randomize (all on by default; pulls from editable NPC categories — see #5).
  - Optional seed prompt ("dark fantasy tavern keeper").
  - "Generate" button.
- New edge function `npc-randomizer` (Lovable AI, structured output via tool calling) returns a fully-populated NPC matching the user's editable category templates and project tone (genre/toneNotes from current project).
- Result preview in dialog with "Save as Character" → `useStore.upsertItem({ type: 'character', ... })`.

### 5. Editable NPC categories with "+ add option" dropdowns
**New file:** `src/lib/npc-templates.ts` (Zustand + persist)
- Schema: `{ id, projectId, key, label, options: string[], allowMultiple?: boolean }`
- Default seed (per-project on first access):
  - Strain: Mental, Physical, Elemental, Sensory, Wild, Hybrid (multi-select, Wild exclusive)
  - Power Type: Pyro, Cryo, Mental Manipulation, Shadow Manipulation, Glamour
  - Gender: M, F, MtF, FtM, NB
  - Sexual Orientation: Straight, Gay, Lesbian, Bi, Pan, Ace, Demi, Queer
  - Archetype, Alignment, Role (extensible).
- CRUD: addCategory, addOption, removeOption, renameOption, removeCategory, reorder.

**New file:** `src/components/EditableSelect.tsx`
- Reusable dropdown built on shadcn `Select` / `Popover` + `Command`.
- Each item rendered with optional inline delete (✕) on hover.
- Sticky footer row: `+ Add new "{label}"` → inline input → adds to template store.
- Used in:
  - NPC Randomizer dialog (one EditableSelect per category).
  - Character edit form (`EntityPage` extra fields can opt-in via a new field type `editableSelect` referencing a template `key`).

**File:** `src/routes/characters.tsx`
- Convert `extraFields` like `gender`, `powers`, etc. to `editableSelect` referencing the new templates.

**New page (optional, recommended):** `src/routes/settings.tsx` section "NPC Templates"
- Manage all template categories project-wide (add/remove categories, edit options).
- Linked from a small "Manage templates" button inside the Randomizer dialog.

### 6. Wiring & polish
- Toasts on every create/save action.
- `logAudit` for: category created, project created, NPC randomized, template option added/removed.
- Ensure Family-Friendly toggle is respected in `npc-randomizer` system prompt (mirror existing pathway functions).
- Reduce-motion + readable contrast preserved.

### Files touched / created
**Created**
- `supabase/functions/category-icon/index.ts`
- `supabase/functions/npc-randomizer/index.ts`
- `src/lib/npc-templates.ts`
- `src/components/EditableSelect.tsx`
- `src/components/NpcRandomizer.tsx`
- `src/components/NewProjectDialog.tsx`

**Edited**
- `src/components/Sidebar.tsx` (+ button + AI icon flow + use stored icon)
- `src/components/ProjectSwitcher.tsx` (+ New Project entry)
- `src/lib/category-icons.ts` (export icon allowlist for AI to choose from + lookup-by-name helper)
- `src/routes/characters.tsx` (Randomizer button + editable dropdowns)
- `src/routes/settings.tsx` (NPC templates manager)
- `supabase/config.toml` (register new functions, `verify_jwt = false`)

### Out of scope (ask first if needed)
- Migrating npc templates to Supabase tables (kept local-first via Zustand persist for now, matching `categories` pattern).
- Bulk NPC generation (single NPC per click).

Confirm and I'll implement.