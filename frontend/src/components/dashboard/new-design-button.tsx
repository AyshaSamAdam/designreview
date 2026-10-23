import Link from "next/link";

export function NewDesignButton() {
  return (
    <div className="mt-6">
      <Link
        href="/prompts"
        className="inline-block rounded-xl bg-brand px-5 py-3 font-sans text-sm font-semibold text-void shadow-sm transition duration-200 hover:-translate-y-px hover:bg-brand/90 hover:shadow-md"
      >
        New design
      </Link>
    </div>
  );
}