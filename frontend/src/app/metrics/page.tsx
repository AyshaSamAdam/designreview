"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Row = {
  kind: string;
  calls: number;
  failed: number;
  avgMs: number;
  p95Ms: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
};

type Metrics = {
  windowDays: number;
  byKind: Row[];
  totals: { calls: number; failed: number; inputTokens: number; outputTokens: number; costUsd: number | null };
  reviews: { graded: number; grades: { missed: number; partial: number; solid: number } };
  costPerGradedReviewUsd: number | null;
};

const KIND_LABEL: Record<string, string> = {
  text: "Interviewer questions",
  ask_follow_up: "Follow-up questions",
  grade_box: "Grading",
  tools: "Other",
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const money = (value: number | null) => (value === null ? "price not set" : `$${value.toFixed(4)}`);
const count = (value: number) => Math.round(value).toLocaleString();

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <p className="font-mono text-xs uppercase text-ink-dim">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function MetricsPage() {
  const router = useRouter();
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing , setMissing ] = useState(false)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await apiFetch("/review/metrics");
        if (res.status === 401) {
          router.push("/sign-in");
          return;
        }

          if (res.status === 404) {
          if (!cancelled) setMissing(true)
          return;
        }

        
        if (!res.ok) {
          if (!cancelled) setError("Could not load the numbers.");
          return;
        }
        const body = (await res.json()) as Metrics;
        if (!cancelled) setData(body);
      } catch {
        if (!cancelled) setError("Can't reach the server. Try again in a moment.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const failureRate = data && data.totals.calls > 0 ? (data.totals.failed / data.totals.calls) * 100 : 0;

  if (missing) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Page not found</h1>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-ink-dim transition-colors hover:text-ink">
          ← Back to dashboard
        </Link>
      </main>
    );
  }


  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-ink-dim transition-colors hover:text-ink">
        ← Back to dashboard
      </Link>

      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">How the AI is doing</h1>
      <p className="mt-2 text-sm leading-6 text-ink-dim">
        Totals for the last {data?.windowDays ?? 7} days, from every AI call this app makes. No names and no answers
        are shown, only numbers.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      {!data && !error && <p className="mt-8 text-sm text-ink-dim">Loading...</p>}

      {data && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="AI calls" value={count(data.totals.calls)} />
            <Card label="Failed calls" value={`${failureRate.toFixed(1)}%`} />
            <Card label="Graded boxes" value={count(data.reviews.graded)} />
            <Card label="Cost per graded box" value={money(data.costPerGradedReviewUsd)} />
          </div>

          <h2 className="mt-10 font-display text-lg font-semibold">By kind of call</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="font-mono text-xs uppercase text-ink-dim">
                <tr>
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3">Calls</th>
                  <th className="px-4 py-3">Failed</th>
                  <th className="px-4 py-3">Average</th>
                  <th className="px-4 py-3">Slowest 5%</th>
                  <th className="px-4 py-3">Tokens in / out</th>
                  <th className="px-4 py-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.byKind.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-ink-dim">
                      No AI calls yet in this time window.
                    </td>
                  </tr>
                )}
                {data.byKind.map((row) => (
                  <tr key={row.kind} className="border-t border-line">
                    <td className="px-4 py-3">{KIND_LABEL[row.kind] ?? row.kind}</td>
                    <td className="px-4 py-3">{count(row.calls)}</td>
                    <td className="px-4 py-3">{count(row.failed)}</td>
                    <td className="px-4 py-3">{seconds(row.avgMs)}</td>
                    <td className="px-4 py-3">{seconds(row.p95Ms)}</td>
                    <td className="px-4 py-3">
                      {count(row.inputTokens)} / {count(row.outputTokens)}
                    </td>
                    <td className="px-4 py-3">{money(row.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-10 font-display text-lg font-semibold">Grades given</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Card label="Not yet" value={count(data.reviews.grades.missed)} />
            <Card label="Partly there" value={count(data.reviews.grades.partial)} />
            <Card label="Solid" value={count(data.reviews.grades.solid)} />
          </div>
        </>
      )}
    </main>
  );
}