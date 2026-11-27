"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icon";

export type SignInState = "default" | "session-ended" | "signed-out" | "error";

export function SignInPanel({ initial }: { initial: SignInState }) {
  const router = useRouter();
  const [state, setState] = useState<SignInState>(initial);
  const [pending, setPending] = useState(false);

  function signIn() {
    setPending(true);
    window.location.assign("/auth/login?returnTo=/organizations");
  }

  function tryAgain() {
    setState("default");
    router.replace("/signin");
  }

  return (
    <div className="signin-page">
      <div className="signin-bar">
        <strong className="signin-logo">
          <span className="signin-mark" aria-hidden="true">
            O
          </span>
          Organization
        </strong>
      </div>
      <main className="signin-main">
        <div className="card stack signin-card">
          <h1>Sign in</h1>
          <p>Sign in with your account to see the organizations you manage.</p>

          {state === "session-ended" && (
            <div className="alert alert-info" role="status">
              <Icon name="clock" />
              <span>Your session ended. Sign in again to continue.</span>
            </div>
          )}
          {state === "signed-out" && (
            <div className="alert alert-success" role="status">
              <Icon name="check" />
              <span>You signed out.</span>
            </div>
          )}

          {state === "error" ? (
            <div className="stack">
              <div className="alert alert-danger" role="alert">
                <Icon name="flag" />
                <span>
                  Sign-in failed. We couldn&apos;t sign you in, so nothing was changed. Try again.
                </span>
              </div>
              <button className="btn btn-secondary btn-lg" type="button" onClick={tryAgain}>
                Try again
              </button>
            </div>
          ) : (
            <>
              <button
                className="btn btn-primary btn-lg"
                type="button"
                disabled={pending}
                onClick={signIn}
              >
                {pending ? "Signing in…" : "Sign in"}
              </button>
              <p className="signin-note">You will sign in through your identity provider.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
