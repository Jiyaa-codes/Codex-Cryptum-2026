"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { sandboxApi } from "../lib/sandbox-api";
import { api, ApiError } from "../lib/api";
import { useApp } from "../lib/context";
import { ErrorNotice } from "./ui";

export function SandboxInvestigation({ solved }: { solved: boolean }) {
  const { setSession, busy, transact } = useApp();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // The request is deliberately discoverable in the browser's network
    // inspector. Do not render its records or provide an exploit editor.
    async function prepare(retries = 4) {
      try {
        const board = await sandboxApi.leaderboard();
        if (!active) return;
        if (board.entries.length < 2) setError("This investigation needs at least two registered teams.");
        else setReady(true);
      } catch (cause) {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 409 && retries > 0) {
          retryTimer = setTimeout(() => void prepare(retries - 1), 250 * 2 ** (4 - retries));
        } else setError((cause as Error).message);
      }
    }
    void prepare();
    return () => { active = false; clearTimeout(retryTimer); };
  }, [attempt]);

  async function verify() {
    setVerifying(true); setError(""); setStatus("");
    try {
      await transact(async () => {
        const result = await sandboxApi.complete();
        if (result.completed) {
          setSession(await api.session());
          setStatus(`Evidence verified. ${result.points_awarded} points awarded.`);
        } else setStatus("Evidence is not sufficient yet. Follow the clue trail and inspect the application's requests before trying again.");
      });
    } catch (cause) { setError((cause as Error).message); }
    finally { setVerifying(false); }
  }

  return <section className="sandbox-panel investigation-panel" aria-labelledby="investigation-heading">
    <div className="page-heading"><div><span className="section-kicker">FINAL INVESTIGATION</span><h2 id="investigation-heading"><Search size={24} /> Follow the trace</h2></div></div>
    <p>The earlier hints point beyond the assistant. Inspect the application's network requests and test where identity becomes permission. The evidence must come from an action you perform.</p>
    <p className="notice">Work only in the isolated practice service. Official competition scores are outside the target. No flag submission is needed.</p>
    {error && <ErrorNotice message={error} retry={() => { setError(""); setReady(false); setAttempt(value => value + 1); }} />}
    {!ready && !error && !solved && <output>Preparing the investigation…</output>}
    <button type="button" className="button" disabled={busy || verifying || solved || !ready} onClick={() => void verify()}>
      {solved ? "Investigation completed" : verifying ? "Checking evidence…" : "Verify evidence"}
    </button>
    {status && <output className="notice" aria-live="polite">{status}</output>}
  </section>;
}
