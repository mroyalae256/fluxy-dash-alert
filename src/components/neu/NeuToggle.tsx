import { cn } from "@/lib/utils";

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}

export function NeuToggle<T extends string>({ value, options, onChange, className }: Props<T>) {
  return (
    <div className={cn("neu-inset-sm inline-flex p-1 gap-1", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              active ? "neu-raised-sm text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
