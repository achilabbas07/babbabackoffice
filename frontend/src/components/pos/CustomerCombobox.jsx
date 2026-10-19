import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export const CustomerCombobox = ({ value, customers, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = customers.find((c) => c.id === value);
  const pick = (id) => {
    onChange(id);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button data-testid="order-customer-select" type="button" className="flex h-9 min-w-0 items-center justify-between gap-1 rounded-md border border-input bg-transparent px-3 text-sm">
          <span className={`truncate ${selected ? "" : "text-muted-foreground"}`}>{selected ? selected.name : "Pelanggan umum"}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <Command filter={(v, s) => (v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0)}>
          <CommandInput data-testid="order-customer-search" placeholder="Cari nama pelanggan..." />
          <CommandList>
            <CommandEmpty>Pelanggan tidak ditemukan</CommandEmpty>
            <CommandGroup>
              <CommandItem data-testid="order-customer-option-none" value="__umum Pelanggan umum" onSelect={() => pick("none")}>
                <Check className={`mr-2 h-4 w-4 ${value === "none" ? "opacity-100" : "opacity-0"}`} />Pelanggan umum
              </CommandItem>
              {customers.map((c) => (
                <CommandItem key={c.id} data-testid={`order-customer-option-${c.id}`} value={`${c.name} ${c.phone || ""} ${c.id}`} onSelect={() => pick(c.id)}>
                  <Check className={`mr-2 h-4 w-4 ${value === c.id ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
