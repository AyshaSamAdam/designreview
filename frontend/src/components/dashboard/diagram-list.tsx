"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type DiagramSummary = {
  id: string;
  title: string;
  isPublic: boolean;
  updatedAt: string;
};

type DiagramsResponse = {
  diagrams: DiagramSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const PAGE_SIZE = 12;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function DiagramList() {
  const router = useRouter();
  const [data, setData] = useState<DiagramsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore , setLoadingMore] = useState(false);
  const [loadingMoreError, setLoadingMoreError] = useState<string | null> (null)

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch(`/diagrams?page=1&limit=${PAGE_SIZE}`);

        if (response.status === 401) {
          router.push("/sign-in");
          return;
        }

        if (!response.ok) {
          if (!cancelled) setError("Could not load your diagrams.");
          return;
        }

        const body: DiagramsResponse = await response.json();
        if (!cancelled) setData(body);
      } catch {
        if (!cancelled) setError("Can't reach the server. Check your connection and try again.");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);


async function loadMore() {
  if (!data) return;

  setLoadingMore(true);
  setLoadingMoreError(null);

  try {
    const nextPage = data.pagination.page + 1;
    const response = await apiFetch(`/diagrams?page=${nextPage}&limit=${PAGE_SIZE}`);

    if (response.status === 401) {
      router.push("/sign-in");
      return;
    }

    if (!response.ok) throw new Error("load more failed");

    const body: DiagramsResponse = await response.json();

    setData((current) => {
      if (!current) return body;
      const seen = new Set(current.diagrams.map((d) => d.id));
      const fresh = body.diagrams.filter((d) => !seen.has(d.id));
      return { diagrams: [...current.diagrams, ...fresh], pagination: body.pagination };
    });
  } catch {
    setLoadingMoreError("Could not load more diagrams. Please try again.");
  } finally {
    setLoadingMore(false);
  }
}













  if (error) {
    return (
      <section className="mt-8">
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg border border-line px-4 py-2 font-mono text-sm transition-colors hover:bg-elevated"
        >
          Try again
        </button>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="mt-8" aria-busy="true">
        <h2 className="font-display text-lg font-semibold">Your diagrams</h2>
        <div role="status" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Loading your diagrams</span>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-panel" />
          ))}
        </div>
      </section>
    );
  }

  if (data.diagrams.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Your diagrams</h2>
        <div className="mt-4 rounded-xl border border-dashed border-line px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold">No diagrams yet</p>
          <p className="mt-2 text-sm text-ink-dim">
            Your designs will show up here once you create one.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold">Your diagrams</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.diagrams.map((diagram) => (
          <li key={diagram.id}>
            <Link
              href={`/room/${diagram.id}`}
              className="block rounded-xl border border-line bg-panel p-5 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="truncate font-display text-base font-semibold">{diagram.title}</h3>
                {diagram.isPublic && (
                  <span className="shrink-0 rounded-md border border-line px-2 py-0.5 font-mono text-xs text-ink-dim">
                    PUBLIC
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-ink-dim">
                Edited {dateFormat.format(new Date(diagram.updatedAt))}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      
{data.pagination.page < data.pagination.totalPages && (
  <div className="mt-6 flex items-center gap-4">
    <button
      type="button"
      onClick={loadMore}
      disabled={loadingMore}
      className="rounded-lg border border-line px-4 py-2 font-mono text-sm transition-colors hover:bg-elevated disabled:opacity-60"
    >
      {loadingMore ? "Loading..." : "Load more"}
    </button>
    <p className="text-sm text-ink-faint">
      Showing {data.diagrams.length} of {data.pagination.total}
    </p>
  </div>
)}
{loadingMoreError&& (
  <p role="alert" className="mt-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
    {loadingMoreError}
  </p>
)}
    </section>
  );
}