import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Global presence store to avoid multiple subscriptions
const viewerCounts = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();

function notifyListeners(eventId: string) {
  listeners.get(eventId)?.forEach((cb) => cb());
}

/**
 * Hook to track real viewer count for a specific event using Supabase Realtime Presence.
 * When a user opens a stream, they join the presence channel.
 */
export function useViewerCount(eventId: string | null) {
  const [count, setCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!eventId) return;

    // Listen for count changes
    const listener = () => setCount(viewerCounts.get(eventId) || 0);
    if (!listeners.has(eventId)) listeners.set(eventId, new Set());
    listeners.get(eventId)!.add(listener);

    // Set initial
    setCount(viewerCounts.get(eventId) || 0);

    return () => {
      listeners.get(eventId)?.delete(listener);
    };
  }, [eventId]);

  return count;
}

/**
 * Hook to JOIN a presence channel when viewing a stream.
 * Call this in the PlayerModal when a stream is opened.
 */
export function useJoinViewerPresence(eventId: string | null, isActive: boolean) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!eventId || !isActive) return;

    const channelName = `viewers:${eventId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const totalViewers = Object.keys(state).length;
        viewerCounts.set(eventId, totalViewers);
        notifyListeners(eventId);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ joined_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [eventId, isActive]);
}

/**
 * Hook to get viewer counts for multiple events at once.
 * Subscribes to presence channels for all provided event IDs.
 */
export function useMultiViewerCounts(eventIds: string[]) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());

  useEffect(() => {
    if (eventIds.length === 0) return;

    const newCounts = new Map<string, number>();

    for (const eventId of eventIds) {
      if (channelsRef.current.has(eventId)) continue;

      const channelName = `viewers:${eventId}`;
      const channel = supabase.channel(channelName, {
        config: { presence: { key: `observer-${crypto.randomUUID()}` } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          // Subtract observer connections (those starting with "observer-")
          const viewers = Object.keys(state).filter((k) => !k.startsWith("observer-")).length;
          viewerCounts.set(eventId, viewers);
          notifyListeners(eventId);
          setCounts((prev) => {
            const next = new Map(prev);
            next.set(eventId, viewers);
            return next;
          });
        })
        .subscribe();

      channelsRef.current.set(eventId, channel);
    }

    // Clean up channels for removed event IDs
    for (const [id, channel] of channelsRef.current) {
      if (!eventIds.includes(id)) {
        supabase.removeChannel(channel);
        channelsRef.current.delete(id);
      }
    }

    return () => {
      for (const [, channel] of channelsRef.current) {
        supabase.removeChannel(channel);
      }
      channelsRef.current.clear();
    };
  }, [eventIds.join(",")]);

  return counts;
}
