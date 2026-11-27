"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import "./app-shell.css";

const NAV = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "boards", label: "Boards", icon: "kanban" },
  { id: "my-tasks", label: "My tasks", icon: "check" },
  { id: "settings", label: "Settings", icon: "sliders" },
] as const;

type NavId = (typeof NAV)[number]["id"];

function Icon({ name }: { name: string }) {
  return (
    <svg className="icon" aria-hidden="true">
      <use href={`/icons.svg#i-${name}`} />
    </svg>
  );
}

// Sidebar app shell, following design/app-shell.html.
export function AppShell({ active, children }: { active: NavId; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell" data-shell="sidebar">
      <nav id="app-nav" className="app-nav" aria-label="Main" hidden={!menuOpen}>
        <a className="app-brand" href="/">
          <span className="app-brand-mark" aria-hidden="true">
            P
          </span>
          <span>Product</span>
        </a>
        {NAV.map((item) => (
          <a
            key={item.id}
            className="app-nav-item"
            href="#"
            aria-current={item.id === active ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span className="app-nav-label">{item.label}</span>
          </a>
        ))}
      </nav>
      <div className="app-main">
        <header className="app-header">
          <button
            className="btn btn-ghost btn-icon app-menu"
            type="button"
            aria-controls="app-nav"
            aria-expanded={menuOpen}
            aria-label="Menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
          <div className="app-header-spacer" />
          <button className="btn btn-ghost btn-icon" type="button" aria-label="Search">
            <Icon name="search" />
          </button>
          <button className="btn btn-ghost btn-icon" type="button" aria-label="Alerts">
            <Icon name="bell" />
          </button>
        </header>
        <main className="app-content">{children}</main>
        <footer className="app-footer">Product name · Help · Privacy</footer>
      </div>
    </div>
  );
}
