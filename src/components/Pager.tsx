import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PagerProps {
  page: number;
  onPageChange: (page: number) => void;
  maxPage?: number;
}

export function Pager({ page, onPageChange, maxPage = 100 }: PagerProps) {
  const options = Array.from({ length: maxPage }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-2.5 justify-end my-2">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          "w-10 h-9 rounded-xl grid place-items-center border border-white/10 bg-white/[0.06] transition-all",
          page <= 1 ? "opacity-35 cursor-not-allowed" : "hover:-translate-y-0.5 hover:bg-white/10 hover:border-white/20"
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">
        Página {page}/{maxPage}
      </span>

      <select
        value={page}
        onChange={(e) => onPageChange(Number(e.target.value))}
        className="h-9 rounded-xl bg-white/[0.05] border border-white/10 text-foreground px-3 text-sm outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
      >
        {options.map((p) => (
          <option key={p} value={p} className="bg-background text-foreground">
            Página {p}
          </option>
        ))}
      </select>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= maxPage}
        className={cn(
          "w-10 h-9 rounded-xl grid place-items-center border border-white/10 bg-white/[0.06] transition-all",
          page >= maxPage ? "opacity-35 cursor-not-allowed" : "hover:-translate-y-0.5 hover:bg-white/10 hover:border-white/20"
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}