CREATE TABLE ticket_events (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id integer NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  field text NOT NULL
    CHECK (field IN ('category', 'priority', 'status', 'assigneeId')),
  old_value text,
  new_value text,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ticket_events_ticket_id_created_at_idx
  ON ticket_events (ticket_id, created_at);