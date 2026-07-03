import { InputHTMLAttributes, forwardRef } from "react";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full border-[2px] border-ink rounded-lg px-4 py-2.5 text-base bg-paper placeholder:text-ink/40 outline-none focus:ring-2 focus:ring-coral/60 ${className}`}
        {...rest}
      />
    );
  }
);
