"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { GoogleSignIn } from "../../components/google-sign-in";
import "./organizer.css";

interface Dashboard {
  event: { startsAt: string | null; endsAt: string | null; paused: boolean; teamChatLimit: number };
  teams: { id: string; name: string }[];
  challenges: { id: number; title: string; active: boolean }[];
  audit: { id: string; action: string; actorId: string; targetId: string; createdAt: string }[];
  usage: { teamId: string; attempts: number }[];
}

async function request(input?: object): Promise<Dashboard> {
  const response = await fetch("/api/organizer", {
    method: input ? "POST" : "GET", cache: "no-store",
    ...(input ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not load organizer controls");
  return data;
}

export default function OrganizerPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    let active = true;
    void request().then(result => { if (active) setData(result); }).catch(cause => { if (active) setError((cause as Error).message); });
    return () => { active = false; };
  }, []);

  async function save(input: object) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { setData(await request(input)); setNotice("Changes saved."); setEditing(null); setCode(""); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save({ action: "event", startsAt: form.get("startsAt") || null, endsAt: form.get("endsAt") || null,
      paused: form.get("paused") === "on", teamChatLimit: Number(form.get("teamChatLimit")) });
  }

  return <div className="organizer-page">
    <div className="organizer-heading"><div><p className="organizer-eyebrow">CODEX CRYPTUM / OPERATIONS</p><h1>Organizer desk</h1><p>Manage the competition, teams, and challenge access.</p></div><Link className="button button-outline" href="/arena">View arena ↗</Link></div>
    {error && <p className="organizer-message" role="alert">{error}</p>}
    {notice && <output className="organizer-message">{notice}</output>}
    {!data ? <section className="organizer-card"><h2>Organizer sign-in</h2><p>Continue with your authorized Google account to open competition controls.</p><GoogleSignIn callbackURL="/organizer" /><button className="button button-outline" onClick={() => { setError(""); void request().then(setData).catch(cause => setError((cause as Error).message)); }}>Refresh access</button></section> : <>
      <div className="organizer-stats"><div><strong>{data.teams.length}</strong><span>Teams</span></div><div><strong>{data.challenges.filter(c => c.active).length}</strong><span>Active challenges</span></div><div><strong>{data.event.paused ? "Paused" : "Scheduled"}</strong><span>Event controls</span></div></div>
      <div className="organizer-grid">
        <section className="organizer-card"><h2>Event settings</h2><p>Times use UTC, for example 2026-10-15T10:00:00Z. Leave blank for no boundary.</p>
          <form key={JSON.stringify(data.event)} onSubmit={saveEvent}>
            <label>Start time (UTC)<input name="startsAt" placeholder="YYYY-MM-DDTHH:mm:ssZ" defaultValue={data.event.startsAt ?? ""} /></label>
            <label>End time (UTC)<input name="endsAt" placeholder="YYYY-MM-DDTHH:mm:ssZ" defaultValue={data.event.endsAt ?? ""} /></label>
            <label>Chat attempts per team<input name="teamChatLimit" type="number" min="1" max="100000" required defaultValue={data.event.teamChatLimit} /></label>
            <p>Failed attempts count toward this event budget. Conversation resets do not replenish it.</p>
            <label className="organizer-check"><input name="paused" type="checkbox" defaultChecked={data.event.paused} /> Pause new chats and scoring</label>
            <button className="button" disabled={busy}>Save event settings</button>
          </form>
        </section>
        <section className="organizer-card"><h2>Challenge access</h2><p>Changes take effect on participants’ next request.</p>
          {data.challenges.map(challenge => <label key={challenge.id} className="organizer-row"><span>{String(challenge.id).padStart(2, "0")} · {challenge.title}</span><input type="checkbox" aria-label={`Enable ${challenge.title}`} checked={challenge.active} disabled={busy} onChange={event => void save({ action: "challenge", id: challenge.id, active: event.target.checked })} /></label>)}
        </section>
      </div>
      <section className="organizer-card"><h2>Teams</h2><form className="organizer-team-form" onSubmit={event => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        void save({ action: "createTeam", name: form.get("name"), accessCode: form.get("accessCode") });
        event.currentTarget.reset();
      }}><label>Team name<input name="name" required maxLength={80} /></label><label>Access code<input name="accessCode" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label><button className="button" disabled={busy}>Create team</button></form>
        {data.teams.map(team => <div key={team.id} className="organizer-team"><div className="organizer-row"><div><strong>{team.name}</strong><p>{data.usage.find(row => row.teamId === team.id)?.attempts ?? 0} / {data.event.teamChatLimit} chat attempts</p></div><button className="button button-outline" disabled={busy} onClick={() => { setEditing(team.id); setCode(""); }}>Manage access</button></div>
          {editing === team.id && <form onSubmit={event => { event.preventDefault(); void save({ action: "rotateCode", teamId: team.id, accessCode: code }); }}>
            <p>Rotating the code signs out this team’s current sessions. Share the new code with approved teammates.</p>
            <label>New access code<input type="password" value={code} onChange={event => setCode(event.target.value)} required minLength={12} maxLength={128} autoComplete="new-password" /></label>
            <div className="organizer-actions"><button className="button" disabled={busy}>Rotate code and sign out</button><button className="button button-outline" type="button" disabled={busy} onClick={() => void save({ action: "revokeSessions", teamId: team.id })}>Sign out current sessions</button><button type="button" className="button button-outline" onClick={() => setEditing(null)}>Cancel</button></div>
            <p>Signing out sessions alone allows members to rejoin with their existing code.</p>
          </form>}
        </div>)}
      </section>
      <section className="organizer-card"><h2>Recent organizer activity</h2>{data.audit.length ? <div className="organizer-audit"><table><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Target</th></tr></thead><tbody>{data.audit.map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}</td><td>{row.action}</td><td>{row.actorId}</td><td>{row.targetId}</td></tr>)}</tbody></table></div> : <p>No organizer changes recorded yet.</p>}</section>
    </>}
  </div>;
}
