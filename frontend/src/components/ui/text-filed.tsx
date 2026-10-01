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
      <label htmlFor={id} className="mb-1.5 block font-mono text-xs text-ink-dim">
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
        className="w-full rounded-lg border border-line bg-void px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  );
}