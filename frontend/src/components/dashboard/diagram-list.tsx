"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { DiagramCard, type DiagramSummary } from "@/components/dashboard/diagram-card";

type DiagramsResponse = {
  diagrams: DiagramSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type DiagramListProps = {
  title: string;
  path: string;
  badge?: string;
  editable?: boolean;
  hideWhenEmpty?: boolean;
  emptyTitle?: string;
  emptyText?: string;
};

const PAGE_SIZE = 12;

export function DiagramList({
  title,
  path,
  badge,
  editable = false,
  hideWhenEmpty = false,
  emptyTitle = "No diagrams yet",
  emptyText = "Your designs will show up here once you create one.",
}: DiagramListProps) {
  const router = useRouter();
  const [data, setData] = useState<DiagramsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch(`${path}?page=1&limit=${PAGE_SIZE}`);

        if (response.status === 401) {
          router.push("/sign-in");
          return;
        }

        if (!response.ok) {
          if (!cancelled) setError("Could not load these diagrams.");
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
  }, [path, router]);

  async function loadMore() {
    if (!data) return;

    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const nextPage = data.pagination.page + 1;
      const response = await apiFetch(`${path}?page=${nextPage}&limit=${PAGE_SIZE}`);

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
      setLoadMoreError("Could not load more diagrams. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  function handleRenamed(id: string, newTitle: string) {
    setData((current) =>
      current
        ? {
            ...current,
            diagrams: current.diagrams.map((d) =>
              d.id === id ? { ...d, title: newTitle, updatedAt: new Date().toISOString() } : d
            ),
          }
        : current
    );
  }

  function handleDeleted(id: string) {
    setData((current) => {
      if (!current) return current;

      const total = Math.max(current.pagination.total - 1, 0);

      return {
        diagrams: current.diagrams.filter((d) => d.id !== id),
        pagination: {
          ...current.pagination,
          total,
          totalPages: Math.ceil(total / current.pagination.limit),
        },
      };
    });
  }

  if (error) {
    return (
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p role="alert" className="mt-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
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
    if (hideWhenEmpty) return null;

    return (
      <section className="mt-8" aria-busy="true">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <div role="status" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Loading {title}</span>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-panel" />
          ))}
        </div>
      </section>
    );
  }

  if (data.diagrams.length === 0) {
    if (hideWhenEmpty) return null;

    return (
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <div className="mt-4 rounded-xl border border-dashed border-line px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold">{emptyTitle}</p>
          <p className="mt-2 text-sm text-ink-dim">{emptyText}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.diagrams.map((diagram) => (
          <DiagramCard
            key={diagram.id}
            diagram={diagram}
            badge={badge}
            editable={editable}
            onRenamed={handleRenamed}
            onDeleted={handleDeleted}
          />
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

      {loadMoreError && (
        <p role="alert" className="mt-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
          {loadMoreError}
        </p>
      )}
    </section>
  );
}





































































// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { apiFetch } from "@/lib/api";

// type DiagramSummary = {
//   id: string;
//   title: string;
//   isPublic: boolean;
//   updatedAt: string;
// };

// type DiagramsResponse = {
//   diagrams: DiagramSummary[];
//   pagination: { page: number; limit: number; total: number; totalPages: number };
// };

// type DiagramListProps = {
//   title: string;
//   path: string;
//   badge?: string;
//   hideWhenEmpty?: boolean;
//   emptyTitle?: string;
//   emptyText?: string;
// };

// const PAGE_SIZE = 12;

// const dateFormat = new Intl.DateTimeFormat("en-US", {
//   month: "short",
//   day: "numeric",
//   year: "numeric",
// });

// export function DiagramList({title,path,badge,hideWhenEmpty = false,emptyTitle = "No diagrams yet",emptyText = "Your designs will show up here once you create one.",}: DiagramListProps) {
//   const router = useRouter();
//   const [data, setData] = useState<DiagramsResponse | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

//   useEffect(() => {
//     let cancelled = false;

//     async function load() {
//       try {
//         const response = await apiFetch(`${path}?page=1&limit=${PAGE_SIZE}`);

//         if (response.status === 401) {
//           router.push("/sign-in");
//           return;
//         }

//         if (!response.ok) {
//           if (!cancelled) setError("Could not load these diagrams.");
//           return;
//         }

//         const body: DiagramsResponse = await response.json();
//         if (!cancelled) setData(body);
//       } catch {
//         if (!cancelled) setError("Can't reach the server. Check your connection and try again.");
//       }
//     }

//     load();

//     return () => {
//       cancelled = true;
//     };
//   }, [path, router]);

//   async function loadMore() {
//     if (!data) return;

//     setLoadingMore(true);
//     setLoadMoreError(null);

//     try {
//       const nextPage = data.pagination.page + 1;
//       const response = await apiFetch(`${path}?page=${nextPage}&limit=${PAGE_SIZE}`);

//       if (response.status === 401) {
//         router.push("/sign-in");
//         return;
//       }

//       if (!response.ok) throw new Error("load more failed");

//       const body: DiagramsResponse = await response.json();

//       setData((current) => {
//         if (!current) return body;
//         const seen = new Set(current.diagrams.map((d) => d.id));
//         const fresh = body.diagrams.filter((d) => !seen.has(d.id));
//         return { diagrams: [...current.diagrams, ...fresh], pagination: body.pagination };
//       });
//     } catch {
//       setLoadMoreError("Could not load more diagrams. Please try again.");
//     } finally {
//       setLoadingMore(false);
//     }
//   }

//   if (error) {
//     return (
//       <section className="mt-8">
//         <h2 className="font-display text-lg font-semibold">{title}</h2>
//         <p role="alert" className="mt-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
//           {error}
//         </p>
//         <button
//           type="button"
//           onClick={() => window.location.reload()}
//           className="mt-4 rounded-lg border border-line px-4 py-2 font-mono text-sm transition-colors hover:bg-elevated"
//         >
//           Try again
//         </button>
//       </section>
//     );
//   }

//   if (!data) {
//     if (hideWhenEmpty) return null;

//     return (
//       <section className="mt-8" aria-busy="true">
//         <h2 className="font-display text-lg font-semibold">{title}</h2>
//         <div role="status" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//           <span className="sr-only">Loading {title}</span>
//           {Array.from({ length: 3 }, (_, i) => (
//             <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-panel" />
//           ))}
//         </div>
//       </section>
//     );
//   }

//   if (data.diagrams.length === 0) {
//     if (hideWhenEmpty) return null;

//     return (
//       <section className="mt-8">
//         <h2 className="font-display text-lg font-semibold">{title}</h2>
//         <div className="mt-4 rounded-xl border border-dashed border-line px-6 py-12 text-center">
//           <p className="font-display text-lg font-semibold">{emptyTitle}</p>
//           <p className="mt-2 text-sm text-ink-dim">{emptyText}</p>
//         </div>
//       </section>
//     );
//   }

//   return (
//     <section className="mt-8">
//       <h2 className="font-display text-lg font-semibold">{title}</h2>
//       <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//         {data.diagrams.map((diagram) => (
//           <li key={diagram.id}>
//             <Link
//               href={`/room/${diagram.id}`}
//               className="block rounded-xl border border-line bg-panel p-5 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
//             >
//               <div className="flex items-start justify-between gap-3">
//                 <h3 className="truncate font-display text-base font-semibold">{diagram.title}</h3>
//                 <div className="flex shrink-0 gap-2">
//                   {badge && (
//                     <span className="rounded-md border border-line px-2 py-0.5 font-mono text-xs text-ink-dim">
//                       {badge}
//                     </span>
//                   )}
//                   {diagram.isPublic && (
//                     <span className="rounded-md border border-line px-2 py-0.5 font-mono text-xs text-ink-dim">
//                       PUBLIC
//                     </span>
//                   )}
//                 </div>
//               </div>
//               <p className="mt-3 text-sm text-ink-dim">
//                 Edited {dateFormat.format(new Date(diagram.updatedAt))}
//               </p>
//             </Link>
//           </li>
//         ))}
//       </ul>

//       {data.pagination.page < data.pagination.totalPages && (
//         <div className="mt-6 flex items-center gap-4">
//           <button
//             type="button"
//             onClick={loadMore}
//             disabled={loadingMore}
//             className="rounded-lg border border-line px-4 py-2 font-mono text-sm transition-colors hover:bg-elevated disabled:opacity-60"
//           >
//             {loadingMore ? "Loading..." : "Load more"}
//           </button>
//           <p className="text-sm text-ink-faint">
//             Showing {data.diagrams.length} of {data.pagination.total}
//           </p>
//         </div>
//       )}

//       {loadMoreError && (
//         <p role="alert" className="mt-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
//           {loadMoreError}
//         </p>
//       )}
//     </section>
//   );
// }