"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { ValidationError } from "@/lib/api/job-openings";
import type { JobOpening, JobOpeningDetails } from "@/lib/api/job-openings";

const EMPLOYMENT_TYPES = ["Full time", "Part time", "Contract"];

const REQUIRED_FIELDS = [
  { id: "title", label: "Job title", message: "Enter a job title." },
  { id: "department", label: "Department", message: "Enter a department." },
  { id: "location", label: "Location", message: 'Enter a location, or "Remote".' },
  { id: "employment_type", label: "Employment type", message: "Choose an employment type." },
] as const;

type Props = {
  // null means a new opening
  opening: JobOpening | null;
  onSave: (details: JobOpeningDetails) => Promise<void>;
  onCancel: () => void;
};

export function OpeningFormDrawer({ opening, onSave, onCancel }: Props) {
  const [values, setValues] = useState<JobOpeningDetails>({
    title: opening?.title ?? "",
    department: opening?.department ?? "",
    location: opening?.location ?? "",
    employment_type: opening?.employment_type ?? "",
    description: opening?.description ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const set = (field: keyof JobOpeningDetails, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const missing: Record<string, string> = {};
    for (const field of REQUIRED_FIELDS) {
      if (!values[field.id].trim()) missing[field.id] = field.message;
    }
    setErrors(missing);
    if (Object.keys(missing).length > 0) return;

    setSaving(true);
    try {
      await onSave({
        ...values,
        title: values.title.trim(),
        department: values.department.trim(),
        location: values.location.trim(),
        description: values.description.trim(),
      });
    } catch (error) {
      if (error instanceof ValidationError) setErrors(error.fields);
      else setFailure("Your changes could not be saved. Try again.");
      setSaving(false);
    }
  }

  const statusNote = opening
    ? `Status: ${opening.status === "open" ? "Open" : "Closed"}. Change it with Open or Close in the list.`
    : "A new opening is saved as open. Open or close it from the list.";

  return (
    <>
      <div className="backdrop" onClick={onCancel} />
      <aside className="drawer is-open" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <form onSubmit={submit} noValidate>
          <div className="panel-head cluster-between">
            <h2 id="drawer-title" className="text-2xl">
              {opening ? "Edit opening" : "Create opening"}
            </h2>
            <button type="button" className="btn-icon" aria-label="Close panel" onClick={onCancel}>
              <svg className="icon" aria-hidden="true">
                <use
                  href="/icons.svg#i-plus"
                  style={{ transform: "rotate(45deg)", transformOrigin: "center" }}
                />
              </svg>
            </button>
          </div>
          <div className="drawer-body stack">
            {REQUIRED_FIELDS.map((field) => (
              <div className="field" key={field.id}>
                <label htmlFor={`f-${field.id}`}>{field.label}</label>
                {field.id === "employment_type" ? (
                  <select
                    className="input"
                    id={`f-${field.id}`}
                    value={values.employment_type}
                    aria-invalid={errors[field.id] ? "true" : undefined}
                    aria-describedby={`e-${field.id}`}
                    onChange={(e) => set("employment_type", e.target.value)}
                  >
                    <option value="">Choose a type</option>
                    {EMPLOYMENT_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input"
                    id={`f-${field.id}`}
                    value={values[field.id]}
                    autoComplete="off"
                    autoFocus={field.id === "title"}
                    aria-invalid={errors[field.id] ? "true" : undefined}
                    aria-describedby={`e-${field.id}`}
                    onChange={(e) => set(field.id, e.target.value)}
                  />
                )}
                {errors[field.id] && (
                  <p className="field-error" id={`e-${field.id}`}>
                    {errors[field.id]}
                  </p>
                )}
              </div>
            ))}
            <div className="field">
              <label htmlFor="f-description">Description (optional)</label>
              <textarea
                className="textarea"
                id="f-description"
                rows={4}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <p className="text-sm text-muted">{statusNote}</p>
            {failure && (
              <p className="field-error" role="alert">
                {failure}
              </p>
            )}
          </div>
          <div className="drawer-foot cluster">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save opening"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
