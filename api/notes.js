import { neon } from "@neondatabase/serverless";
import { hashVisitor, readVisitorAddress, validateNote } from "./_noteRules.js";

const LIST_LIMIT = 60;
const NOTES_PER_HOUR = 5;
const TINT_COUNT = 4;

export async function GET() {
  try {
    const rows = await sql()`
      SELECT id, message, author, tint, created_at
      FROM room_notes
      WHERE is_hidden = false
      ORDER BY created_at DESC
      LIMIT ${LIST_LIMIT}
    `;
    return json({ notes: rows.map(toPublicNote) }, 200, { "cache-control": "public, max-age=0, s-maxage=10, stale-while-revalidate=60" });
  } catch (error) {
    return failed(error, "list");
  }
}

export async function POST(request) {
  const body = await readBody(request);
  const checked = validateNote(body);
  if (!checked.ok) return json({ error: checked.error }, 400);
  try {
    const visitorHash = hashVisitor(readVisitorAddress(request.headers), process.env.NOTES_SALT);
    if (await hasReachedLimit(visitorHash)) return json({ error: "That's a lot of notes. Try again in a bit." }, 429);
    const [row] = await sql()`
      INSERT INTO room_notes (message, author, tint, visitor_hash)
      VALUES (${checked.note.message}, ${checked.note.author}, ${Math.floor(Math.random() * TINT_COUNT)}, ${visitorHash})
      RETURNING id, message, author, tint, created_at
    `;
    return json({ note: toPublicNote(row) }, 201);
  } catch (error) {
    return failed(error, "create");
  }
}

async function hasReachedLimit(visitorHash) {
  const [{ count }] = await sql()`
    SELECT count(*)::int AS count
    FROM room_notes
    WHERE visitor_hash = ${visitorHash} AND created_at > now() - interval '1 hour'
  `;
  return count >= NOTES_PER_HOUR;
}

function sql() {
  return neon(process.env.DATABASE_URL);
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function toPublicNote({ id, message, author, tint, created_at }) {
  return { id: Number(id), message, author, tint, createdAt: created_at };
}

function json(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
}

function failed(error, action) {
  console.error(`notes ${action} failed:`, error);
  return json({ error: "The wall is unavailable right now." }, 503);
}
