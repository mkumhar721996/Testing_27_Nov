import type { Metadata } from "next";
import { SignInScreen } from "@/components/auth/sign-in-screen";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <strong className="auth-logo">Product</strong>
      </header>
      <main className="auth-main">
        <SignInScreen />
      </main>
    </div>
  );
}
