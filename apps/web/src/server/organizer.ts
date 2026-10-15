import "server-only";
import { randomBytes, scryptSync } from "node:crypto";
import { challenges, chatOperations, eventSettings, getDb, organizerAudit, sessions, teams } from "@cryptum/db";
import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireGoogleUser } from "./better-auth";
import { HttpError } from "./http";

export async function requireOrganizerUser(headers: Headers) {
  const user = await requireGoogleUser(headers);
  const allowed = (process.env.ORGANIZER_EMAILS ?? "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
  if (!user.emailVerified || !allowed.includes(user.email.toLowerCase())) throw new HttpError(403, "Organizer access required");
  return user;
}

export const organizerAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("event"), startsAt: z.iso.datetime().nullable(), endsAt: z.iso.datetime().nullable(), paused: z.boolean(), teamChatLimit: z.number().int().min(1).max(100000) }).strict(),
  z.object({ action: z.literal("createTeam"), name: z.string().trim().min(1).max(80), accessCode: z.string().min(12).max(128) }).strict(),
  z.object({ action: z.literal("rotateCode"), teamId: z.uuid(), accessCode: z.string().min(12).max(128) }).strict(),
  z.object({ action: z.literal("revokeSessions"), teamId: z.uuid() }).strict(),
  z.object({ action: z.literal("challenge"), id: z.number().int().positive(), active: z.boolean() }).strict(),
]);

export async function organizerSnapshot() {
  const db = getDb();
  const [event, teamRows, catalog, audit, usage] = await Promise.all([
    db.select().from(eventSettings).where(eq(eventSettings.id, 1)),
    db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.name)),
    db.select({ id: challenges.id, title: challenges.title, active: challenges.active }).from(challenges).orderBy(asc(challenges.id)),
    db.select().from(organizerAudit).orderBy(desc(organizerAudit.createdAt)).limit(50),
    db.select({ teamId: chatOperations.teamId, attempts: sql<number>`count(*)::integer` }).from(chatOperations).groupBy(chatOperations.teamId),
  ]);
  return { event: event[0] ?? { startsAt: null, endsAt: null, paused: false, teamChatLimit: 500 }, teams: teamRows, challenges: catalog, audit, usage };
}

export async function applyOrganizerAction(actorId: string, input: z.infer<typeof organizerAction>) {
  const hash = "accessCode" in input ? (() => {
    const salt = randomBytes(16).toString("hex");
    return `${salt}:${scryptSync(input.accessCode, salt, 64).toString("hex")}`;
  })() : "";
  await getDb().transaction(async tx => {
    let targetId = "event";
    switch (input.action) {
      case "event": {
        if (input.startsAt && input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) throw new HttpError(400, "End time must follow start time");
        const values = { id: 1, startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null, paused: input.paused, teamChatLimit: input.teamChatLimit };
        await tx.insert(eventSettings).values(values).onConflictDoUpdate({ target: eventSettings.id, set: values });
        break;
      }
      case "createTeam": {
        const [team] = await tx.insert(teams).values({ name: input.name, accessCodeHash: hash }).onConflictDoNothing().returning({ id: teams.id });
        if (!team) throw new HttpError(409, "A team with this name already exists");
        targetId = team.id;
        break;
      }
      case "rotateCode":
      case "revokeSessions": {
        targetId = input.teamId;
        const [team] = await tx.select({ id: teams.id }).from(teams).where(eq(teams.id, input.teamId)).for("update");
        if (!team) throw new HttpError(404, "Team not found");
        if (input.action === "rotateCode") await tx.update(teams).set({ accessCodeHash: hash }).where(eq(teams.id, input.teamId));
        await tx.delete(sessions).where(eq(sessions.teamId, input.teamId));
        break;
      }
      case "challenge": {
        targetId = String(input.id);
        const updated = await tx.update(challenges).set({ active: input.active }).where(eq(challenges.id, input.id)).returning({ id: challenges.id });
        if (!updated.length) throw new HttpError(404, "Challenge not found");
        break;
      }
    }
    // Never retain access codes, prompts, flags, or OAuth credentials in the audit trail.
    await tx.insert(organizerAudit).values({ actorId, action: input.action, targetId });
  });
}
