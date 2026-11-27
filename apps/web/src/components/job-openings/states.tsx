function Icon({ name }: { name: string }) {
  return (
    <svg
      className="icon"
      aria-hidden="true"
      style={{ width: "var(--icon-size-lg)", height: "var(--icon-size-lg)" }}
    >
      <use href={`/icons.svg#i-${name}`} />
    </svg>
  );
}

export function LoadingState() {
  return (
    <div
      className="page-body stack"
      aria-busy="true"
      role="status"
      aria-label="Loading job openings"
    >
      <div className="skeleton" style={{ height: "var(--control-height-md)" }} />
      {[0, 1, 2].map((n) => (
        <div key={n} className="skeleton" style={{ height: "var(--density-row-height)" }} />
      ))}
    </div>
  );
}

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="page-body">
      <div className="empty-state">
        <Icon name="users" />
        <h2 className="text-xl">No job openings yet</h2>
        <p className="text-muted">
          Create an opening to start tracking candidates from application to hire.
        </p>
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          <svg className="icon" aria-hidden="true">
            <use href="/icons.svg#i-plus" />
          </svg>
          Create opening
        </button>
      </div>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="page-body">
      <div className="alert alert-danger" role="alert">
        <div className="stack-sm">
          <strong>Job openings could not be loaded</strong>
          <span>Your openings are safe. Check your connection and try again.</span>
          <div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ForbiddenState() {
  return (
    <div className="page-body">
      <div className="empty-state">
        <Icon name="user" />
        <h2 className="text-xl">Job openings are for HR admins</h2>
        <p className="text-muted">
          You are signed in without the HR admin role, so you cannot view, create, edit, open or
          close openings. Ask an HR admin if you need access.
        </p>
      </div>
    </div>
  );
}
