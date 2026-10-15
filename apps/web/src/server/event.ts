import "server-only";
import { eventSettings, getDb } from "@cryptum/db";
import { eq } from "drizzle-orm";
import { HttpError } from "./http";
import { eventBlockReason } from "./event-policy";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export async function requireOpenEvent(tx: Tx) {
  const [settings] = await tx.select().from(eventSettings).where(eq(eventSettings.id, 1)).limit(1);
  const policy = settings ?? { startsAt: null, endsAt: null, paused: false, teamChatLimit: 500 };
  const reason = eventBlockReason(policy);
  if (reason) throw new HttpError(403, reason);
  return policy;
}
