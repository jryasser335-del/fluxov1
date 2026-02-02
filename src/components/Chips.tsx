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
        "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 border",
        active
          ? "bg-gradient-to-r from-primary to-accent text-white border-primary/50 shadow-lg shadow-primary/20"
          : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08] hover:border-white/20 hover:text-white"
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
