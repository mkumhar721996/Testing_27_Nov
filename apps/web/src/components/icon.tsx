type IconName = "clock" | "check" | "flag" | "user";

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      aria-hidden="true"
      style={{ width: "var(--icon-size-md)", height: "var(--icon-size-md)" }}
    >
      <use href={`/icons.svg#i-${name}`} />
    </svg>
  );
}
