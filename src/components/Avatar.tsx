export function Avatar({ name, color, size = 20 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center font-hand font-semibold"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.55 }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}
