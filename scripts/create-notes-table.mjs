import { neon } from "@neondatabase/serverless";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const sql = neon(DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS room_notes (
    id bigserial PRIMARY KEY,
    message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 140),
    author text CHECK (author IS NULL OR char_length(author) <= 24),
    tint smallint NOT NULL DEFAULT 0,
    visitor_hash text NOT NULL,
    is_hidden boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS room_notes_created_idx ON room_notes (created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS room_notes_visitor_idx ON room_notes (visitor_hash, created_at DESC)`;

const [{ count }] = await sql`SELECT count(*)::int AS count FROM room_notes`;
console.log(`room_notes ready (${count} rows)`);
