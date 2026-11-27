CREATE TABLE job_openings (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL,
    department text NOT NULL,
    location text NOT NULL,
    employment_type text NOT NULL CHECK (employment_type IN ('Full time', 'Part time', 'Contract')),
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Minimal table: the candidates story extends it.
CREATE TABLE candidates (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    opening_id bigint NOT NULL REFERENCES job_openings (id),
    stage text NOT NULL CHECK (
        stage IN ('Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected', 'Withdrawn')
    )
);

CREATE INDEX candidates_opening_id_idx ON candidates (opening_id);
