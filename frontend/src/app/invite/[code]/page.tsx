import { InviteAccept } from "@/components/invite/invite-accept";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join a diagram | DesignReview",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <InviteAccept code={code} />;
}