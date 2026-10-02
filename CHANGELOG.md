# Changelog

## 2026-10-03

### Fixed
- The post-it wall panel was unstyled, so the 3D canvas sat over it and notes could not be posted. The styles were deleted by mistake when the visual effects were removed; they are restored, and `tests/styleCoverage.test.js` now fails if a station's styles go missing.
- Choosing another station from the menu while one is open now closes the open one, waits for the camera to settle, and opens the new one. Before, the request was silently ignored.

## 2026-10-02

### Added
- Post-it wall: a cluster of notes on the left wall opens a panel where visitors read and leave short notes (140 characters, optional name). Notes are stored in the `room_notes` table (Neon) through `api/notes.js`. Posting is limited to 5 notes per hour per visitor, links are rejected, and visitors are identified only by an HMAC of their address. Hide a note with `UPDATE room_notes SET is_hidden = true WHERE id = ...`. Requires `DATABASE_URL` and `NOTES_SALT`; create the table with `scripts/create-notes-table.mjs`.
- Photo wall: clicking the collage or the far half of the desk zooms in on an about card with a portrait, a word-by-word story reveal, Free time and Goals tabs, a résumé button and icon links to Substack, TikTok, Instagram, LinkedIn and email.
- Travel globe: 11 places with photos and written pieces.
- Sound effects, synthesized with Web Audio (no audio files): footsteps while walking, key clicks in the terminal, a page turn in the book and a slide when a record is pulled. A menu item turns them off; the choice is remembered.
- Tapping outside a station's window (desk, tripod, bookshelf, records, post-it wall) steps back out of it.
- Mobile: tappable quick-command buttons in the desk terminal.
- Tests for note validation (`npm test`).

### Changed
- The overhead camera climbs on tall, narrow screens so the whole room fits.
- The joystick and action button hide while any station is open.
- Globe labels that would overlap are stacked.
- "Play this one" asks the embed to play immediately, so phones start audio inside the tap.
- Music is resumed when a station closes, and after any pause the visitor did not ask for.

### Fixed
- Globe label stacking could loop forever on rounding; overlap checks now have a tolerance.

### Known limits
- The Spotify embed exposes no volume control, so loudness follows the visitor's device and Spotify settings.
