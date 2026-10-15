export interface EventPolicy {
  startsAt: Date | null;
  endsAt: Date | null;
  paused: boolean;
}

export function eventBlockReason(settings: EventPolicy, now = new Date()): string | null {
  if (settings.paused) return "The competition is paused.";
  if (settings.startsAt && now < settings.startsAt) return "The competition has not started yet.";
  if (settings.endsAt && now >= settings.endsAt) return "The competition has ended.";
  return null;
}
