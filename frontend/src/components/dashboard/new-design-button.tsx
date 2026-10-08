import Link from "next/link";

export function NewDesignButton() {
  return (
    <div className="mt-6">
      <Link
        href="/prompts"
        className="inline-block rounded-lg bg-brand px-5 py-2.5 font-mono text-sm font-medium text-void transition-opacity hover:opacity-90"
      >
        New design
      </Link>
    </div>
  );
}