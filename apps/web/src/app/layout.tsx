import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web App",
  description: "comp_web_app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className="min-h-screen antialiased"
        style={{
          background: "var(--color-bg)",
          color: "var(--color-fg)",
          fontFamily: "var(--font-family-body)",
        }}
      >{children}</body>
    </html>
  );
}
