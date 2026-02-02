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
        "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
        active
          ? "bg-primary text-white"
          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
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
