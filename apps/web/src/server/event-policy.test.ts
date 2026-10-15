import { expect, it } from "vitest";
import { eventBlockReason } from "./event-policy";

const start = new Date("2026-10-15T10:00:00Z");
const end = new Date("2026-10-15T12:00:00Z");
it("accepts the start instant, rejects the end instant, and pauses open events", () => {
  const policy = { startsAt: start, endsAt: end, paused: false };
  expect(eventBlockReason(policy, new Date(start.getTime() - 1))).toContain("not started");
  expect(eventBlockReason(policy, start)).toBeNull();
  expect(eventBlockReason(policy, end)).toContain("ended");
  expect(eventBlockReason({ ...policy, paused: true }, start)).toContain("paused");
  expect(eventBlockReason({ startsAt: null, endsAt: null, paused: false })).toBeNull();
});
