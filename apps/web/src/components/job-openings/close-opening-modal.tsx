import type { JobOpening } from "@/lib/api/job-openings";

type Props = {
  opening: JobOpening;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CloseOpeningModal({ opening, busy, onConfirm, onCancel }: Props) {
  const body =
    opening.candidate_count === 0
      ? "It has no candidates. You can open it again later."
      : `All ${opening.candidate_count} ${opening.candidate_count === 1 ? "candidate is" : "candidates are"} Hired, Rejected or Withdrawn. You can open it again later.`;

  return (
    <>
      <div className="backdrop" onClick={onCancel} />
      <div className="modal is-open" role="dialog" aria-modal="true" aria-labelledby="close-title">
        <div className="stack">
          <h2 id="close-title" className="text-xl">
            Close this opening?
          </h2>
          <p className="text-muted">{body}</p>
          <div className="cluster">
            <button type="button" className="btn btn-danger" disabled={busy} onClick={onConfirm}>
              {busy ? "Closing…" : "Close opening"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Keep open
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
