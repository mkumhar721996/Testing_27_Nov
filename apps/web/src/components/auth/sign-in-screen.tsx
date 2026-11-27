"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Tab = "sign-in" | "sign-up";
type View = "form" | "loading" | "error" | "unverified" | "sign-up-error" | "verify-email";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

type Errors = Partial<Record<"name" | "email" | "password", string>>;

function Field({
  id,
  label,
  error,
  hint,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={error ? "input is-invalid" : "input"}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
      {hint && (
        <div className="field-hint" id={`${id}-hint`}>
          {hint}
        </div>
      )}
      {error && (
        <div className="field-error" id={`${id}-err`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export function SignInScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sign-in");
  const [view, setView] = useState<View>("form");
  const [errors, setErrors] = useState<Errors>({});
  const [email, setEmail] = useState("");

  function show(next: Tab, nextView: View = "form") {
    setTab(next);
    setView(nextView);
    setErrors({});
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const name = value("name");
    const address = value("email");
    const password = String(data.get("password") ?? "");
    const signUp = tab === "sign-up";

    const found: Errors = {};
    if (signUp && !name) found.name = "Enter your full name.";
    if (!EMAIL_PATTERN.test(address)) {
      found.email = "Enter your email address, for example you@example.com.";
    }
    if (signUp ? password.length < 8 : !password) {
      found.password = signUp ? "Use at least 8 characters." : "Enter your password.";
    }
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }

    setErrors({});
    setEmail(address);
    setView("loading");
    try {
      const res = await fetch(signUp ? "/api/auth/sign-up" : "/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(signUp ? { name, email: address, password } : { email: address, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (signUp) {
        setView(res.status === 201 && body.code === "verify_email" ? "verify-email" : "sign-up-error");
      } else if (res.ok) {
        router.push("/profile");
      } else {
        setView(body.code === "email_not_verified" ? "unverified" : "error");
      }
    } catch {
      setView(signUp ? "sign-up-error" : "error");
    }
  }

  const tabs = [
    { id: "sign-in" as const, label: "Sign in" },
    { id: "sign-up" as const, label: "Create account" },
  ];

  return (
    <div className="card auth-card">
      <div className="tabs" role="tablist" aria-label="Account">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => show(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "form" && tab === "sign-in" && (
        <form className="stack" onSubmit={submit} noValidate>
          <h1>Sign in to your account</h1>
          <p>Sign in with your Auth0 account to see your traveller profile and preferences.</p>
          <Field id="si-email" name="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email} />
          <Field id="si-password" name="password" label="Password" type="password" autoComplete="current-password" error={errors.password} />
          <button type="submit" className="btn btn-primary">
            Continue with Auth0
          </button>
        </form>
      )}

      {view === "form" && tab === "sign-up" && (
        <form className="stack" onSubmit={submit} noValidate>
          <h1>Create your account</h1>
          <p>Account details are handled by Auth0. You will be asked to confirm your email.</p>
          <Field id="su-name" name="name" label="Full name" type="text" autoComplete="name" error={errors.name} />
          <Field id="su-email" name="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email} />
          <Field id="su-password" name="password" label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." error={errors.password} />
          <button type="submit" className="btn btn-primary">
            Sign up with Auth0
          </button>
        </form>
      )}

      {view === "loading" && (
        <div className="stack" aria-busy="true">
          <h1>Contacting Auth0</h1>
          <p role="status">Waiting for Auth0 to respond. This usually takes a few seconds.</p>
          <button type="button" className="btn btn-primary" disabled aria-label="Continue with Auth0, loading">
            <span className="auth-spin" aria-hidden="true" /> Continuing…
          </button>
          <button type="button" className="btn btn-primary" disabled aria-label="Sign up with Auth0, loading">
            <span className="auth-spin" aria-hidden="true" /> Signing up…
          </button>
        </div>
      )}

      {view === "error" && (
        <div className="stack">
          <div className="alert alert-danger" role="alert">
            Sign-in failed. Check your details and try again.
          </div>
          <h1>Sign in to your account</h1>
          <p>The email or password did not match an account.</p>
          <button type="button" className="btn btn-primary" onClick={() => show("sign-in")}>
            Try again
          </button>
        </div>
      )}

      {view === "unverified" && (
        <div className="stack">
          <div className="alert alert-warning" role="alert">
            Sign-in was refused. Verify your email address first: open the message Auth0 sent to{" "}
            <strong>{email}</strong> and select its link.
          </div>
          <h1>Verify your email address</h1>
          <p>Once it is verified, sign in again with the same email and password.</p>
          <button type="button" className="btn btn-primary" onClick={() => show("sign-in")}>
            Try again
          </button>
        </div>
      )}

      {view === "sign-up-error" && (
        <div className="stack">
          <div className="alert alert-danger" role="alert">
            Sign-up failed. Auth0 could not create the account, for example because the email is
            already in use.
          </div>
          <h1>Create your account</h1>
          <p>Check your details and try again. If you already have an account, use the Sign in tab.</p>
          <button type="button" className="btn btn-primary" onClick={() => show("sign-up")}>
            Try again
          </button>
        </div>
      )}

      {view === "verify-email" && (
        <div className="stack">
          <div className="alert alert-info" role="status">
            Auth0 sent a message to <strong>{email}</strong>. Verify your email address to finish
            creating your account.
          </div>
          <h1>Check your inbox</h1>
          <p>
            Your account is created once you verify your email address. Then sign in to go straight
            to your Traveller profile.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => show("sign-in")}>
            Go to sign in
          </button>
        </div>
      )}
    </div>
  );
}
