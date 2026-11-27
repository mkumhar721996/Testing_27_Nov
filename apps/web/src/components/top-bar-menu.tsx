"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "./icon";

const SIGN_OUT_URL = "/auth/logout?returnTo=/signin%3Freason%3Dsigned-out";

export function TopBarMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (event.key === "Escape") {
      setOpen(false);
      button.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = (items.indexOf(document.activeElement as HTMLElement) + step + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div className="dropdown" ref={root} onKeyDown={onKeyDown}>
      <button
        ref={button}
        className="btn btn-ghost"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="user" />
        Account
      </button>
      {open && (
        <div className="dropdown-menu" role="menu" style={{ left: "auto", right: 0 }}>
          <a className="dropdown-item" role="menuitem" href={SIGN_OUT_URL}>
            Sign out
          </a>
        </div>
      )}
    </div>
  );
}
