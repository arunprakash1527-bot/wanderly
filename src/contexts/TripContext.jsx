// ─── TripContext Facade ───
// Backward-compatible useTrip() hook that merges all 4 split contexts.
// Existing consumers can continue using useTrip() unchanged.
// New code should import from the specific context directly.

import { useTripData, TripDataProvider } from "./TripDataContext";
import { useTripUI, TripUIProvider } from "./TripUIContext";
import { useTimeline, TimelineProvider } from "./TimelineContext";
import { usePoll, PollProvider } from "./PollContext";

// Backward-compatible combined provider (wraps all 4 in correct order)
export function TripProvider({ children }) {
  return (
    <TripDataProvider>
      <TripUIProvider>
        <TimelineProvider>
          <PollProvider>
            {children}
          </PollProvider>
        </TimelineProvider>
      </TripUIProvider>
    </TripDataProvider>
  );
}

// Backward-compatible hook — merges all 4 contexts
export function useTrip() {
  const data = useTripData();
  const ui = useTripUI();
  const timeline = useTimeline();
  const polls = usePoll();
  return { ...data, ...ui, ...timeline, ...polls };
}
