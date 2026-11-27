"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CloseRefusedError,
  ForbiddenError,
  closeJobOpening,
  createJobOpening,
  listJobOpenings,
  openJobOpening,
  updateJobOpening,
} from "@/lib/api/job-openings";
import type { JobOpening, JobOpeningDetails } from "@/lib/api/job-openings";
import { CloseOpeningModal } from "./close-opening-modal";
import { OpeningFormDrawer } from "./opening-form-drawer";
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from "./states";

type Load = "loading" | "ready" | "error" | "forbidden";
// "new" is the create drawer; an opening is the edit drawer for it.
type Drawer = "new" | JobOpening | null;

function inProgressMessage(opening: JobOpening, count: number) {
  return (
    <div>
      <strong>{opening.title} stays open.</strong>{" "}
      {count === 1 ? "1 candidate is" : `${count} candidates are`} still in Applied, Screening,
      Interview or Offer. Move each to Hired, Rejected or Withdrawn, then close the opening.
    </div>
  );
}

export function JobOpeningsView() {
  const [load, setLoad] = useState<Load>("loading");
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [closing, setClosing] = useState<JobOpening | null>(null);
  const [closeBusy, setCloseBusy] = useState(false);
  const [refusal, setRefusal] = useState<React.ReactNode>(null);
  const [toast, setToast] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoad("loading");
    try {
      setOpenings(await listJobOpenings());
      setLoad("ready");
    } catch (error) {
      setOpenings([]);
      setLoad(error instanceof ForbiddenError ? "forbidden" : "error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const replace = (saved: JobOpening) =>
    setOpenings((current) => current.map((o) => (o.id === saved.id ? saved : o)));

  async function save(details: JobOpeningDetails) {
    if (drawer && drawer !== "new") {
      replace(await updateJobOpening(drawer.id, details));
      setToast("Your changes are saved.");
    } else {
      const created = await createJobOpening(details);
      setOpenings((current) => [created, ...current]);
      setToast("Opening created and open.");
    }
    setDrawer(null);
  }

  function askClose(opening: JobOpening) {
    setRefusal(null);
    if (opening.in_progress_count > 0) {
      setRefusal(inProgressMessage(opening, opening.in_progress_count));
      setToast(`Close refused. ${opening.title} still has candidates in progress.`);
    } else {
      setClosing(opening);
    }
  }

  async function confirmClose() {
    if (!closing) return;
    setCloseBusy(true);
    try {
      replace(await closeJobOpening(closing.id));
      setToast(`${closing.title} is closed.`);
    } catch (error) {
      if (error instanceof CloseRefusedError) {
        setRefusal(inProgressMessage(closing, error.inProgress));
      } else {
        setRefusal(<div>{closing.title} could not be closed. Try again.</div>);
      }
    } finally {
      setCloseBusy(false);
      setClosing(null);
    }
  }

  async function open(opening: JobOpening) {
    setRefusal(null);
    try {
      replace(await openJobOpening(opening.id));
      setToast(`${opening.title} is open.`);
    } catch {
      setRefusal(<div>{opening.title} could not be opened. Try again.</div>);
    }
  }

  const openCount = openings.filter((o) => o.status === "open").length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Job openings</h1>
          <p className="text-muted">
            Every hire starts from an opening. Close an opening once all of its candidates are
            Hired, Rejected or Withdrawn.
          </p>
        </div>
      </div>

      {load === "loading" && <LoadingState />}
      {load === "error" && <ErrorState onRetry={reload} />}
      {load === "forbidden" && <ForbiddenState />}
      {load === "ready" && openings.length === 0 && <EmptyState onCreate={() => setDrawer("new")} />}
      {load === "ready" && openings.length > 0 && (
        <div className="page-body stack">
          <div className="toolbar">
            <span className="text-muted" aria-live="polite">
              {openings.length} {openings.length === 1 ? "opening" : "openings"}, {openCount} open
            </span>
            <span className="toolbar-spacer" />
            <button type="button" className="btn btn-primary" onClick={() => setDrawer("new")}>
              <svg className="icon" aria-hidden="true">
                <use href="/icons.svg#i-plus" />
              </svg>
              Create opening
            </button>
          </div>
          {refusal && (
            <div className="alert alert-danger" role="alert">
              {refusal}
            </div>
          )}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Opening</th>
                  <th scope="col">Department</th>
                  <th scope="col">Location</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">
                    Candidates
                  </th>
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {openings.map((o) => {
                  const isOpen = o.status === "open";
                  const split =
                    o.candidate_count === 0
                      ? "No candidates yet"
                      : `${o.in_progress_count} in progress, ${o.candidate_count - o.in_progress_count} finished`;
                  return (
                    <tr key={o.id}>
                      <td>
                        <div className="font-medium">{o.title}</div>
                        <span className="opening-id">{o.reference}</span>
                      </td>
                      <td data-label="Department">{o.department}</td>
                      <td data-label="Location">{o.location}</td>
                      <td data-label="Status">
                        <span className={isOpen ? "badge badge-success" : "badge"}>
                          {isOpen ? "Open" : "Closed"}
                        </span>
                      </td>
                      <td className="num" data-label="Candidates">
                        <div className="count-total">{o.candidate_count}</div>
                        <div className="count-split">{split}</div>
                      </td>
                      <td>
                        <div className="cluster row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            aria-label={`Edit ${o.title}`}
                            onClick={() => setDrawer(o)}
                          >
                            Edit
                          </button>
                          {isOpen ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              aria-label={`Close ${o.title}`}
                              onClick={() => askClose(o)}
                            >
                              Close
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              aria-label={`Open ${o.title}`}
                              onClick={() => void open(o)}
                            >
                              Open
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted">
            Candidates counts include Rejected and Withdrawn candidates, which stay on record.
          </p>
        </div>
      )}

      {drawer && (
        <OpeningFormDrawer
          key={drawer === "new" ? "new" : drawer.id}
          opening={drawer === "new" ? null : drawer}
          onSave={save}
          onCancel={() => setDrawer(null)}
        />
      )}
      {closing && (
        <CloseOpeningModal
          opening={closing}
          busy={closeBusy}
          onConfirm={() => void confirmClose()}
          onCancel={() => setClosing(null)}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
