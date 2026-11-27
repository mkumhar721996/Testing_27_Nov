CREATE TABLE IF NOT EXISTS traveller_profiles (
    user_id text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    seat text NULL,
    cabin text NULL,
    diet text NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
