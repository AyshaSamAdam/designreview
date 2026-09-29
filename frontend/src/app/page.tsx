import { ButtonLink } from "@/components/ui/button-link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-10">
      <h1 className="font-display text-4xl font-semibold">Theme check</h1>
      <p className="mt-2 text-ink-dim">Body text in Inter, in the dim ink color.</p>
      <p className="mt-2 font-mono text-sm text-brand">
        Mono text in IBM Plex Mono, in the brand blue.
      </p>
      <div className="mt-6 flex gap-3">
        <div className="h-12 w-12 rounded-lg border border-line bg-panel" />
        <div className="h-12 w-12 rounded-lg bg-elevated" />
        <div className="h-12 w-12 rounded-lg bg-brand" />
        <div className="h-12 w-12 rounded-lg bg-warn" />
        <div className="h-12 w-12 rounded-lg bg-good" />
        <div className="h-12 w-12 rounded-lg bg-bad" />
      </div>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/sign-in">Sign in</ButtonLink>
        <ButtonLink href="/pricing" variant="secondary">Pricing</ButtonLink>
      </div>
    </main>
  );
}