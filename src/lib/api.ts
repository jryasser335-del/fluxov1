import { useState, useEffect } from "react";
import { fetchESPNScoreboard, getTimeUntilEvent, formatCountdown, ESPNEvent } from "./api";

function EventCard({ event }: { event: ESPNEvent }) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const competition = event.competitions[0];
      const timeUntil = getTimeUntilEvent(competition.date);
      setCountdown(formatCountdown(timeUntil));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000); // Actualiza cada segundo

    return () => clearInterval(interval);
  }, [event]);

  const competition = event.competitions[0];
  const status = competition.status.type.state;

  return (
    <div className="event-card">
      <div className="countdown-badge">{status === "in" ? "EN VIVO" : countdown}</div>
      {/* Resto de tu card */}
    </div>
  );
}

function EventsList() {
  const [events, setEvents] = useState<ESPNEvent[]>([]);

  useEffect(() => {
    async function loadEvents() {
      // Obtiene eventos de hoy + los próximos 7 días
      const data = await fetchESPNScoreboard("ita", 7);
      setEvents(data.events);
    }
    loadEvents();
  }, []);

  return (
    <div>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
