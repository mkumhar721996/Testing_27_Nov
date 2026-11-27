"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CABIN_OPTIONS,
  DIET_OPTIONS,
  SEAT_OPTIONS,
  fetchProfile,
  saveProfile,
  validateDraft,
  type Profile,
  type ProfileDraft,
} from "@/lib/profile-api";

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; profile: Profile };
type PrefKey = "seat" | "cabin" | "diet";

const PREFERENCES: { key: PrefKey; label: string; options: readonly string[] }[] = [
  { key: "seat", label: "Preferred seat", options: SEAT_OPTIONS },
  { key: "cabin", label: "Preferred cabin", options: CABIN_OPTIONS },
  { key: "diet", label: "Dietary needs", options: DIET_OPTIONS },
];

const toDraft = ({ name, email, seat, cabin, diet }: Profile): ProfileDraft => ({
  name,
  email,
  seat,
  cabin,
  diet,
});

export function TravellerProfile() {
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ status: "loading" });

  const loadProfile = useCallback(() => {
    setLoad({ status: "loading" });
    fetchProfile().then(
      (profile) => setLoad({ status: "ready", profile }),
      () => setLoad({ status: "error" }),
    );
  }, []);

  useEffect(loadProfile, [loadProfile]);

  return (
    <div className="page pf-page">
      {load.status === "loading" && (
        <div className="stack" aria-busy="true" aria-label="Loading your profile">
          <div className="card pf-skel">
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
          <div className="card pf-skel">
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        </div>
      )}
      {load.status === "error" && (
        <div className="alert alert-danger" role="alert">
          <p>Your profile could not be loaded. Check your connection and try again.</p>
          <button type="button" className="btn btn-secondary" onClick={loadProfile}>
            Try again
          </button>
        </div>
      )}
      {load.status === "ready" && (
        <ProfileForm
          key={load.profile.email}
          initial={load.profile}
          onSignOut={() => router.push("/sign-in")}
        />
      )}
    </div>
  );
}

function ProfileForm({ initial, onSignOut }: { initial: Profile; onSignOut: () => void }) {
  const [saved, setSaved] = useState<Profile>(initial);
  const [draft, setDraft] = useState<ProfileDraft>(toDraft(initial));
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [addingPrefs, setAddingPrefs] = useState(false);

  const savedDraft = toDraft(saved);
  const dirty = (Object.keys(draft) as (keyof ProfileDraft)[]).some(
    (k) => draft[k] !== savedDraft[k],
  );
  const noSavedPrefs = !saved.seat && !saved.cabin && !saved.diet;
  const showPrompt = noSavedPrefs && !addingPrefs;

  const edit = (patch: Partial<ProfileDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setShowSuccess(false);
    setSaveFailed(false);
  };

  const onCancel = () => {
    setDraft(toDraft(saved));
    setErrors({});
    setShowSuccess(false);
    setSaveFailed(false);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateDraft(draft);
    setErrors(found);
    if (found.name || found.email) return;
    setSaving(true);
    try {
      const next = await saveProfile({
        ...draft,
        name: draft.name.trim(),
        email: draft.email.trim(),
      });
      setSaved(next);
      setDraft(toDraft(next));
      setShowSuccess(true);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <div className="page-title">
          <h1>Your traveller profile</h1>
          <div className="pf-roles" role="group" aria-label="Your roles">
            {saved.roles.map((role) => (
              <span key={role} className="badge badge-primary">
                {role}
              </span>
            ))}
          </div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <form className="stack" noValidate onSubmit={onSubmit}>
        <div className="card pf-card">
          <h2>Personal details</h2>
          <div className="field">
            <label htmlFor="pf-name">Full name</label>
            <input
              className={`input${errors.name ? " is-invalid" : ""}`}
              id="pf-name"
              type="text"
              autoComplete="name"
              value={draft.name}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby="pf-name-err"
              onChange={(e) => edit({ name: e.target.value })}
            />
            <div className="field-error" id="pf-name-err" role="alert">
              {errors.name}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pf-email">Email</label>
            <input
              className={`input${errors.email ? " is-invalid" : ""}`}
              id="pf-email"
              type="email"
              autoComplete="email"
              value={draft.email}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby="pf-email-err"
              onChange={(e) => edit({ email: e.target.value })}
            />
            <div className="field-error" id="pf-email-err" role="alert">
              {errors.email}
            </div>
          </div>
        </div>

        {showPrompt ? (
          <div className="card">
            <div className="empty-state">
              <h2>No travel preferences yet</h2>
              <p>Add a seat, cabin or dietary preference so your trips start the way you like.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setAddingPrefs(true)}
              >
                Add preferences
              </button>
            </div>
          </div>
        ) : (
          <div className="card pf-card">
            <h2>{noSavedPrefs ? "Add travel preferences" : "Travel preferences"}</h2>
            <div className="pf-grid">
              {PREFERENCES.map(({ key, label, options }) => (
                <div className="field" key={key}>
                  <label htmlFor={`pf-${key}`}>{label}</label>
                  <select
                    className="select"
                    id={`pf-${key}`}
                    value={draft[key] ?? ""}
                    onChange={(e) => edit({ [key]: e.target.value || null })}
                  >
                    <option value="">No preference</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {showSuccess && (
          <div className="alert alert-success" role="status">
            Your changes are saved.
          </div>
        )}
        {saveFailed && (
          <div className="alert alert-danger" role="alert">
            Your changes could not be saved. Check your connection and try again.
          </div>
        )}

        <div className="pf-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!dirty || saving}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </>
  );
}
