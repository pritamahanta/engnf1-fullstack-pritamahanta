CREATE TABLE tickets (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id text NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL,
  auto_category text NOT NULL
    CHECK (auto_category IN ('BILLING', 'BUG', 'FEATURE_REQUEST', 'LOGIN', 'DELIVERY')),
  category text NOT NULL
    CHECK (category IN ('BILLING', 'BUG', 'FEATURE_REQUEST', 'LOGIN', 'DELIVERY')),
  is_human_override boolean NOT NULL DEFAULT false,
  priority text NOT NULL
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  assignee_id integer REFERENCES users(id) ON DELETE SET NULL,
  is_reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);