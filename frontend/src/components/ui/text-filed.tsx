type TextFieldProps = {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
};

export function TextField({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  required,
  minLength,
  hint,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-sans text-[11px] font-semibold tracking-[0.12em] text-ink-dim">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded-xl border border-line bg-void px-3.5 py-3 text-sm text-ink shadow-inner shadow-ink/5 transition focus:border-brand focus:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  );
}