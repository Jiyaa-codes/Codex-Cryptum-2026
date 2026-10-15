import { digest } from "./security";

/** A repeatable, team-specific distraction; it is never a valid scoring flag. */
export function decoyFlagFor(flag: string, level: number): string {
  const phrases: Record<number, string> = {
    1: "welcome_to_the_vault",
    2: "trust_the_first_answer",
    3: "nothing_to_see_here",
  };
  const candidate = `cdx{${phrases[level] ?? "visitor_access"}_${digest(`decoy-v1:${level}:${flag}`).slice(0, 16)}}`;
  return candidate === flag ? `${candidate.slice(0, -1)}_sample}` : candidate;
}
