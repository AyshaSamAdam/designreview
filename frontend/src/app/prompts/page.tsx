import type { Metadata } from "next";
import Link from "next/link";
import { PromptPicker } from "@/components/prompts/prompt-picker";

export const metadata: Metadata = {
  title: "Choose a question | DesignReview",
  robots: { index: false, follow: false },
};

export default function PromptsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="font-mono text-sm text-ink-dim hover:text-ink">
        &larr; Dashboard
      </Link>
      <h1 className="mt-6 font-display text-2xl font-semibold">Choose a question</h1>
      <p className="mt-2 text-sm text-ink-dim">
        Pick an interview question to design for, or start from a blank canvas.
      </p>
      <PromptPicker />
    </main>
  );
}