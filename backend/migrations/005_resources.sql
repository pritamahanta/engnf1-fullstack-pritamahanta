CREATE TABLE resources (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('ROOM', 'LAB', 'EQUIPMENT')),
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 500),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX resources_name_lower_key ON resources (lower(name));