import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DiagramList } from "@/components/dashboard/diagram-list";
import { NewDesignButton } from "@/components/dashboard/new-design-button";

export const metadata: Metadata = {
  title: "Dashboard | DesignReview",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <DashboardShell>
        <NewDesignButton />
      <DiagramList />
    </DashboardShell>
  );
}