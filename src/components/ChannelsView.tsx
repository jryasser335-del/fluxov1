import { CHANNELS } from "@/lib/constants";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { Section } from "./Section";
import { SkeletonChannelCard } from "./Skeleton";

export function ChannelsView() {
  const { openPlayer } = usePlayerModal();

  const handleChannelClick = (channel: typeof CHANNELS[0]) => {
    if (channel.stream) {
      openPlayer(channel.name, channel.stream);
    } else {
      console.log(`No stream available for ${channel.name}`);
    }
  };

  return (
    <Section title="Canales" emoji="📺" badge="Links desde código">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {CHANNELS.map((channel) => (
          <div
            key={channel.key}
            onClick={() => handleChannelClick(channel)}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-3 flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/25"
          >
            <div className="flex items-center gap-2.5">
              {/* Logo */}
              <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center overflow-hidden">
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.textContent = "📺";
                    }}
                  />
                ) : (
                  <span>📺</span>
                )}
              </div>
              
              {/* Info */}
              <div>
                <span className="block text-sm font-semibold">{channel.name}</span>
                <span className="text-muted-foreground text-xs">
                  {channel.stream ? "Listo" : "Sin link"}
                </span>
              </div>
            </div>

            {/* Tag */}
            <span className="text-[11px] px-2.5 py-1.5 rounded-full border border-white/10 bg-black/25 text-white/85">
              {channel.stream ? "PLAY" : "NO LINK"}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}
