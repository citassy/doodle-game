import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  const base =
  "font-hand text-xl font-semibold rounded-lg px-5 py-3 transition-transform active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none";  const styles =
    variant === "primary"
      ? "bg-ink text-paper"
      : "bg-transparent text-ink border-[1.5px] border-border-muted hover:border-ink";

  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}
