export function Footer() {
  return (
    <footer className="border-t border-line bg-panel/55">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-9 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display font-medium text-ink-dim">DesignReview</p>
        <p>© {new Date().getFullYear()} DesignReview</p>
      </div>
    </footer>
  );
}