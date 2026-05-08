import { useState, useEffect, ReactNode } from "react";
import { useStore, BaseItem, EntityType, CANON_STATUSES, CanonStatus, statusColor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Edit, Copy, Trash2, Archive, Tag as TagIcon, Download, GitBranch,
  MoreHorizontal, History, RotateCcw, FileJson, FileText, X
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  type: EntityType;
  title: string;
  subtitle?: string;
  extraFields?: { key: string; label: string; placeholder?: string; textarea?: boolean }[];
  emptyHint?: string;
  filterFn?: (i: BaseItem) => boolean;
  renderExtra?: (item: BaseItem) => ReactNode;
}

export function EntityPage({ type, title, subtitle, extraFields = [], emptyHint, filterFn, renderExtra }: Props) {
  const store = useStore();
  const items = store.items.filter(
    (i) => i.projectId === store.currentProjectId && i.type === type && !i.deleted &&
    (filterFn ? filterFn(i) : true)
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<BaseItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [versionsOf, setVersionsOf] = useState<BaseItem | null>(null);
  const [saveDialog, setSaveDialog] = useState<{ item: BaseItem; patch: Partial<BaseItem> } | null>(null);

  const filtered = items.filter((i) => {
    if (!showArchived && i.archived) return false;
    if (statusFilter !== "all" && i.canonStatus !== statusFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((i) => i.id)));
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const selectedIds = Array.from(selected);

  const exportJSON = (ids: string[]) => {
    const data = store.items.filter((i) => ids.includes(i.id));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${type}-export.json`; a.click();
    toast.success(`Exported ${ids.length} item(s) as JSON`);
  };

  const copyMd = (item: BaseItem) => {
    const md = `# ${item.name}\n\n**Status:** ${item.canonStatus}\n\n${item.description || ""}\n\n${item.notes || ""}`;
    navigator.clipboard.writeText(md);
    toast.success("Copied as Markdown");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Button onClick={() => setCreating(true)} className="gradient-violet text-white border-0">
          <Plus className="w-4 h-4 mr-1" /> New {title.replace(/s$/, "")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 panel p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 bg-background" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All canon statuses</SelectItem>
            {CANON_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
          Show archived
        </label>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {allSelected ? "Clear selection" : "Select all"}
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <div className="sticky top-2 z-10 panel p-3 flex flex-wrap items-center gap-2 glow-violet">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="h-4 w-px bg-border mx-1" />
          {selectedIds.length === 1 && (
            <Button size="sm" variant="outline" onClick={() => {
              const it = store.items.find((i) => i.id === selectedIds[0]); if (it) setEditing(it);
            }}>
              <Edit className="w-3 h-3 mr-1" /> Edit
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { selectedIds.forEach(store.duplicateItem); setSelected(new Set()); toast.success("Duplicated"); }}>
            <Copy className="w-3 h-3 mr-1" /> Duplicate
          </Button>
          <Select onValueChange={(v) => { store.bulkSetStatus(selectedIds, v as CanonStatus); toast.success("Status updated"); }}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Change status" /></SelectTrigger>
            <SelectContent>{CANON_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => { store.archiveItems(selectedIds, true); setSelected(new Set()); toast.success("Archived. Undo unavailable in MVP"); }}>
            <Archive className="w-3 h-3 mr-1" /> Archive
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportJSON(selectedIds)}>
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(selectedIds)}>
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="ml-auto">
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        </div>
      )}

      <div className="grid gap-2">
        {filtered.length === 0 && (
          <div className="panel p-12 text-center text-muted-foreground">
            <p>{emptyHint || `No ${title.toLowerCase()} yet. Create one to get started.`}</p>
          </div>
        )}
        {filtered.map((item) => (
          <div key={item.id} className={`panel p-3 flex items-start gap-3 transition-colors ${selected.has(item.id) ? "ring-1 ring-primary" : ""}`}>
            <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} className="mt-1" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setEditing(item)} className="font-medium hover:text-primary text-left">{item.name}</button>
                <Badge className={statusColor(item.canonStatus)}>{item.canonStatus}</Badge>
                {item.archived && <Badge variant="outline">Archived</Badge>}
                {item.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
              </div>
              {item.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
              {renderExtra && renderExtra(item)}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(item)}><Edit className="w-3 h-3 mr-2" />Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => store.duplicateItem(item.id)}><Copy className="w-3 h-3 mr-2" />Duplicate</DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyMd(item)}><FileText className="w-3 h-3 mr-2" />Copy Markdown</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(JSON.stringify(item, null, 2)); toast.success("Copied JSON"); }}>
                  <FileJson className="w-3 h-3 mr-2" />Copy JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportJSON([item.id])}><Download className="w-3 h-3 mr-2" />Export</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVersionsOf(item)}><History className="w-3 h-3 mr-2" />Version history ({item.versions.length})</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => store.archiveItems([item.id], !item.archived)}>
                  <Archive className="w-3 h-3 mr-2" />{item.archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmDelete([item.id])} className="text-destructive">
                  <Trash2 className="w-3 h-3 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {/* Create / Edit dialog */}
      <ItemDialog
        open={creating || !!editing}
        item={editing}
        type={type}
        extraFields={extraFields}
        onClose={() => { setCreating(false); setEditing(null); }}
        onCreate={(patch) => { store.addItem({ type, name: patch.name || "Untitled", ...patch }); toast.success("Created"); setCreating(false); }}
        onSaveExisting={(item, patch) => setSaveDialog({ item, patch })}
      />

      {/* Save mode prompt */}
      <AlertDialog open={!!saveDialog} onOpenChange={(o) => !o && setSaveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes</AlertDialogTitle>
            <AlertDialogDescription>Do you want to overwrite the existing version or save this as a new version?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => {
              if (saveDialog) { store.updateItem(saveDialog.item.id, saveDialog.patch, "version"); toast.success("Saved as new version"); }
              setSaveDialog(null); setEditing(null);
            }}>Save as New Version</Button>
            <AlertDialogAction onClick={() => {
              if (saveDialog) { store.updateItem(saveDialog.item.id, saveDialog.patch, "overwrite"); toast.success("Overwritten"); }
              setSaveDialog(null); setEditing(null);
            }}>Overwrite</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This item is linked to other records. Items will move to Trash and can be restored. Linked records will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmDelete) { store.deleteItems(confirmDelete); setSelected(new Set()); toast.success(`Moved ${confirmDelete.length} to Trash`); }
              setConfirmDelete(null);
            }}>Move to Trash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Version history */}
      <Dialog open={!!versionsOf} onOpenChange={(o) => !o && setVersionsOf(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History — {versionsOf?.name}</DialogTitle>
            <DialogDescription>Restore an older version, or duplicate it as a new item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {versionsOf?.versions.length === 0 && <p className="text-sm text-muted-foreground">No previous versions yet. Versions are created when you choose "Save as New Version".</p>}
            {versionsOf?.versions.map((v) => (
              <div key={v.version} className="flex items-center gap-2 panel p-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">Version {v.version}</div>
                  <div className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  if (versionsOf) { store.updateItem(versionsOf.id, v.snapshot, "version"); toast.success("Restored"); setVersionsOf(null); }
                }}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Restore
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemDialog({
  open, item, type, extraFields, onClose, onCreate, onSaveExisting,
}: {
  open: boolean; item: BaseItem | null; type: EntityType;
  extraFields: { key: string; label: string; placeholder?: string; textarea?: boolean }[];
  onClose: () => void;
  onCreate: (patch: Partial<BaseItem>) => void;
  onSaveExisting: (item: BaseItem, patch: Partial<BaseItem>) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<CanonStatus>("Draft");
  const [tags, setTags] = useState("");
  const [data, setData] = useState<Record<string, string>>({});

  // re-init when opens
  useState(() => { /* noop */ });
  if (open && item && name === "" && description === "") {
    // initialize once per open
  }

  // simpler: use key-based reset via effect
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useStateInit(open, item, setName, setDescription, setNotes, setStatus, setTags, setData);

  const handleSave = () => {
    const patch: Partial<BaseItem> = {
      name: name.trim() || "Untitled",
      description: description.trim(),
      notes: notes.trim(),
      canonStatus: status,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      data,
    };
    if (item) onSaveExisting(item, patch);
    else onCreate(patch);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${item.name}` : `New ${type}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Short Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background" rows={2} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-background" rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Canon Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as CanonStatus)}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{CANON_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Tags (comma-separated)</label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} className="bg-background" />
            </div>
          </div>
          {extraFields.map((f) => (
            <div key={f.key}>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</label>
              {f.textarea ? (
                <Textarea value={data[f.key] || ""} onChange={(e) => setData({ ...data, [f.key]: e.target.value })} className="bg-background" rows={2} placeholder={f.placeholder} />
              ) : (
                <Input value={data[f.key] || ""} onChange={(e) => setData({ ...data, [f.key]: e.target.value })} className="bg-background" placeholder={f.placeholder} />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="gradient-violet text-white border-0">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function useStateInit(
  open: boolean, item: BaseItem | null,
  setName: (v: string) => void, setDescription: (v: string) => void,
  setNotes: (v: string) => void, setStatus: (v: CanonStatus) => void,
  setTags: (v: string) => void, setData: (v: Record<string, string>) => void,
) {
  useEffect(() => {
    if (open) {
      setName(item?.name || "");
      setDescription(item?.description || "");
      setNotes(item?.notes || "");
      setStatus((item?.canonStatus as CanonStatus) || "Draft");
      setTags(item?.tags.join(", ") || "");
      const d: Record<string, string> = {};
      Object.entries(item?.data || {}).forEach(([k, v]) => { d[k] = String(v ?? ""); });
      setData(d);
    }
  }, [open, item?.id]); // eslint-disable-line
}
