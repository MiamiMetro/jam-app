import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily media cleanup:
// - removes expired orphan upload objects/sessions
// - trims old consumed upload session rows
crons.interval(
  "daily media cleanup",
  { hours: 24 },
  (internal as any).mediaCleanup.runDailyCleanup
);

crons.interval(
  "expire stale listener sessions",
  { minutes: 1 },
  (internal as any).rooms.expireStaleListenerSessions,
  {}
);

export default crons;

