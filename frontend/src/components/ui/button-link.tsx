import Link from "next/link";

type Variant = "primary" | "secondary";

const base =
  "inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-sans text-sm font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-void shadow-sm hover:-translate-y-px hover:bg-brand/90 hover:shadow-md",
  secondary: "border border-line bg-panel text-ink shadow-sm hover:border-brand/30 hover:bg-elevated",
};

export function ButtonLink({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: Variant;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]}`}>
      {children}
    </Link>
  );
}