import { beforeEach, expect, it, vi } from "vitest";
const identity = vi.hoisted(() => ({ user: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./better-auth", () => ({ requireGoogleUser: identity.user }));
import { organizerAction, requireOrganizerUser } from "./organizer";

beforeEach(() => { vi.unstubAllEnvs(); identity.user.mockReset(); });
it("requires a verified, allowlisted Google identity", async () => {
  vi.stubEnv("ORGANIZER_EMAILS", "organizer@example.com");
  identity.user.mockResolvedValue({ id: "u1", email: "other@example.com", emailVerified: true });
  await expect(requireOrganizerUser(new Headers())).rejects.toMatchObject({ status: 403 });
  identity.user.mockResolvedValue({ id: "u1", email: "organizer@example.com", emailVerified: false });
  await expect(requireOrganizerUser(new Headers())).rejects.toMatchObject({ status: 403 });
  identity.user.mockResolvedValue({ id: "u1", email: "ORGANIZER@example.com", emailVerified: true });
  await expect(requireOrganizerUser(new Headers())).resolves.toMatchObject({ id: "u1" });
  vi.stubEnv("ORGANIZER_EMAILS", "");
  await expect(requireOrganizerUser(new Headers())).rejects.toMatchObject({ status: 403 });
});

it("rejects injected scoring fields, weak access codes, and invalid event budgets", () => {
  expect(organizerAction.safeParse({ action: "createTeam", name: "Team", accessCode: "valid-access-code", score: 9000 }).success).toBe(false);
  expect(organizerAction.safeParse({ action: "createTeam", name: "Team", accessCode: "short" }).success).toBe(false);
  expect(organizerAction.safeParse({ action: "event", startsAt: null, endsAt: null, paused: false, teamChatLimit: 0 }).success).toBe(false);
  expect(organizerAction.safeParse({ action: "challenge", id: 1, active: false }).success).toBe(true);
});
