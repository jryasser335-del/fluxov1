export const STREAMING_PLATFORMS = [
  { value: "netflix", label: "Netflix", color: "#E50914" },
  { value: "disney", label: "Disney+", color: "#113CCF" },
  { value: "hbo", label: "Max", color: "#5822B4" },
  { value: "prime", label: "Prime Video", color: "#00A8E1" },
  { value: "viki", label: "Viki", color: "#1CE783" },
  { value: "rakuten", label: "Rakuten Viki", color: "#BF0000" },
  { value: "crunchyroll", label: "Crunchyroll", color: "#F47521" },
  { value: "paramount", label: "Paramount+", color: "#0064FF" },
  { value: "apple", label: "Apple TV+", color: "#000000" },
  { value: "peacock", label: "Peacock", color: "#000000" },
  { value: "hulu", label: "Hulu", color: "#1CE783" },
  { value: "other", label: "Otro", color: "#666666" },
] as const;

export type PlatformValue = (typeof STREAMING_PLATFORMS)[number]["value"];

export function getPlatformLabel(value: string | null): string {
  if (!value) return "Todos";
  const platform = STREAMING_PLATFORMS.find((p) => p.value === value);
  return platform?.label || value;
}

export function getPlatformColor(value: string | null): string {
  if (!value) return "#666666";
  const platform = STREAMING_PLATFORMS.find((p) => p.value === value);
  return platform?.color || "#666666";
}
