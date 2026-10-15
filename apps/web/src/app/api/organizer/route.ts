import { body, endpoint, json, sameOrigin } from "../../../server/http";
import { applyOrganizerAction, organizerAction, organizerSnapshot, requireOrganizerUser } from "../../../server/organizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = endpoint(async request => {
  await requireOrganizerUser(request.headers);
  return json(await organizerSnapshot());
});
export const POST = endpoint(async request => {
  sameOrigin(request);
  const user = await requireOrganizerUser(request.headers);
  await applyOrganizerAction(user.id, await body(request, organizerAction));
  return json(await organizerSnapshot());
});
