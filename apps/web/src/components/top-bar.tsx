import { SessionWatcher } from "./session-watcher";
import { TopBarMenu } from "./top-bar-menu";

export function TopBar() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: "var(--header-height)",
        padding: "0 var(--page-gutter)",
        background: "var(--color-surface)",
        borderBottom: "var(--border-width) solid var(--color-border)",
      }}
    >
      <strong className="signin-logo">
        <span className="signin-mark" aria-hidden="true">
          O
        </span>
        Organization
      </strong>
      <TopBarMenu />
      <SessionWatcher />
    </header>
  );
}
