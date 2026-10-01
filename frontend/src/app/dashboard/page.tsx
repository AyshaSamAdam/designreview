import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard | DesignReview",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <DashboardShell>
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Your diagrams</h2>
        <p className="mt-2 text-sm text-ink-dim">Your diagrams will appear here.</p>
      </section>
    </DashboardShell>
  );
}