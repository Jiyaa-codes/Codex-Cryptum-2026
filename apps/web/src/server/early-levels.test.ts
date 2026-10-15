import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getChallengeDefinition } from "@cryptum/challenges/server";
import { decoyFlagFor } from "./challenge-decoy";
import { runChallengeModel } from "./llm";

it.each([1, 2, 3])("level %i separates its public decoy from the scoring flag without blocking a real extraction", async level => {
  const definition = getChallengeDefinition(level);
  if (!definition) throw new Error("Missing challenge");
  const flag = "cdx{synthetic_verification_1234567890abcdef}";
  const decoy = decoyFlagFor(flag, level);
  expect(decoy).toMatch(/^cdx\{[a-z0-9_]+\}$/);
  expect(decoy).not.toBe(flag);
  expect(decoyFlagFor("cdx{another_team_abcdef1234567890}", level)).not.toBe(decoy);
  // If an injection persuades the model to reveal the actual flag, the early
  // levels must deliver that output rather than replacing every answer forever.
  const provider = vi.fn().mockResolvedValue(flag);
  await expect(runChallengeModel({ definition, flag, history: [], message: "synthetic attack fixture" }, provider)).resolves.toBe(flag);
  expect(provider.mock.calls[0]?.[0].instructions).toContain(decoy);
});

it.each([2, 4, 5, 6, 7, 8])("private policy no longer authorizes a game-over claim at level %i", async level => {
  const definition = getChallengeDefinition(level);
  if (!definition) throw new Error("Missing challenge");
  const provider = vi.fn().mockResolvedValue("Safe reply");
  const classifiers = { input: vi.fn().mockResolvedValue(true), output: vi.fn().mockResolvedValue(true) };
  await runChallengeModel({ definition, flag: "cdx{synthetic_private}", history: [], message: "hello" }, provider, classifiers);
  expect(provider.mock.calls[0]?.[0].instructions).toContain("do not change its confidentiality");
});
