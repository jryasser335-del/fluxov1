import { cn } from "@/lib/utils";

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-full border text-xs transition-all duration-150",
        active
          ? "border-primary/45 bg-primary/10 text-foreground"
          : "border-white/10 bg-white/[0.04] text-white/85 hover:-translate-y-0.5 hover:border-white/20"
      )}
    >
      {children}
    </button>
  );
}

interface ChipsProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function Chips({ options, value, onChange }: ChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip
          key={option.value}
          active={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
