import { createHmac } from "node:crypto";

export const MAX_MESSAGE_LENGTH = 140;
export const MAX_AUTHOR_LENGTH = 24;

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const LINK_PATTERN = /(https?:\/\/|www\.)/i;
const UNKNOWN_ADDRESS = "unknown";

export function validateNote(body) {
  if (typeof body !== "object" || body === null) return rejected("Send a message to post.");
  const message = typeof body.message === "string" ? clean(body.message) : "";
  const author = typeof body.author === "string" ? clean(body.author) : "";
  if (message.length === 0) return rejected("Write something first.");
  if (message.length > MAX_MESSAGE_LENGTH) return rejected(`Keep it under ${MAX_MESSAGE_LENGTH} characters.`);
  if (author.length > MAX_AUTHOR_LENGTH) return rejected(`Keep your name under ${MAX_AUTHOR_LENGTH} characters.`);
  if (LINK_PATTERN.test(message) || LINK_PATTERN.test(author)) return rejected("No links, please.");
  return { ok: true, note: { message, author: author || null } };
}

export function readVisitorAddress(headers) {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || UNKNOWN_ADDRESS;
}

// Visitors are only ever identified by this hash, so raw addresses are never stored.
export function hashVisitor(address, salt) {
  if (!salt) throw new Error("A salt is required to hash visitors");
  return createHmac("sha256", salt).update(address).digest("hex");
}

function clean(text) {
  return text.replace(CONTROL_CHARACTERS, "").replace(/\s+/g, " ").trim();
}

function rejected(error) {
  return { ok: false, error };
}
