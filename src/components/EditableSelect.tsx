import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, Plus, X } from "lucide-react";

interface Props {
  label: string;
  options: string[];
  value: string | string[] | undefined;
  multiple?: boolean;
  onChange: (v: string | string[]) => void;
  onAddOption?: (v: string) => void;
  onRemoveOption?: (v: string) => void;
  placeholder?: string;
}

export function EditableSelect({ label, options, value, multiple, onChange, onAddOption, onRemoveOption, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState("");
  const arr = Array.isArray(value) ? value : value ? [value] : [];

  const toggle = (opt: string) => {
    if (multiple) {
      const next = arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt];
      onChange(next);
    } else {
      onChange(opt);
      setOpen(false);
    }
  };

  const addNow = () => {
    const v = adding.trim();
    if (!v) return;
    if (!options.includes(v)) onAddOption?.(v);
    if (multiple) onChange(Array.from(new Set([...arr, v])));
    else { onChange(v); setOpen(false); }
    setAdding("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between bg-background font-normal">
          <span className="truncate text-left">
            {arr.length === 0 ? <span className="text-muted-foreground">{placeholder || `Select ${label.toLowerCase()}`}</span> : arr.join(", ")}
          </span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <div className="max-h-[240px] overflow-y-auto py-1">
          {options.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No options yet — add one below.</div>}
          {options.map((o) => {
            const sel = arr.includes(o);
            return (
              <div key={o} className="group flex items-center gap-1 px-1">
                <button
                  onClick={() => toggle(o)}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent text-left"
                >
                  <Check className={`w-3.5 h-3.5 ${sel ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate">{o}</span>
                </button>
                {onRemoveOption && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveOption(o); if (sel) onChange(multiple ? arr.filter((x) => x !== o) : ""); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive"
                    title="Remove option"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {onAddOption && (
          <div className="border-t p-2 flex gap-1">
            <Input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNow()}
              placeholder={`+ Add new ${label.toLowerCase()}`}
              className="h-7 text-xs bg-background"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={addNow}><Plus className="w-3 h-3" /></Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function MultiBadgeRow({ values, onRemove }: { values: string[]; onRemove?: (v: string) => void }) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {values.map((v) => (
        <Badge key={v} variant="outline" className="text-[10px]">
          {v}
          {onRemove && <button onClick={() => onRemove(v)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-2.5 h-2.5" /></button>}
        </Badge>
      ))}
    </div>
  );
}
