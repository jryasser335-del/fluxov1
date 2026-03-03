import { useEffect, useState, ReactNode } from "react";

interface PremiumPageWrapperProps {
  children: ReactNode;
}

export function PremiumPageWrapper({ children }: PremiumPageWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-[0.99]"
      }`}
    >
      {children}
    </div>
  );
}
