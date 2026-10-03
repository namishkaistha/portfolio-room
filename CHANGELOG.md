# Changelog

## 2026-10-03

### Fixed
- Amritsar: "bhajans playing all day" now reads "kirtan playing all day".
- Post-it wall: the panel used to open empty and the notes popped in about a second later. The notes now start loading as soon as you head to the wall and are on the board when the panel appears, settling in with a staggered fade. On a very slow connection the panel shows "Loading the wall…" and fills in when the notes arrive.

### Removed
- The window-of-goals station (sky and drifting goal clouds) is removed for now. It is in git history (commit ee5009d) if it comes back.

### Added
- Bed: stand at the foot of the bed, press Space (or tap the bed, or use the menu) to lie down and nap under a dimmed screen with floating Zs. Space, Enter, Escape or a tap wakes you.
- Closet: stand at the closet to slide the door open and see the clothes hanging inside. A panel lets you mix and match tops (quarter zip, sweater, button down) and bottoms (trousers, parachute pants). Your avatar changes live and the choice is remembered. The selected piece's name scrambles in as a big pixel header, like the TRAVEL globe, with placeholder story text beneath it. Pieces currently differ by color and fabric sheen only; their real stories and looks are still to come.
- `scripts/check-walkable.mjs` and a test that every station's standing spot is reachable from the spawn point using the real room model.

### Fixed
- Napping: the bookcase's body starts just above the mattress at the head wall, so a straight-lying avatar's head sank into it. The avatar now lies diagonally across the bed with its head clear of the bookcase, and the sleep camera pulls back to show the whole body.

### Changed
- Music no longer starts by itself. The player card says "Press play for music" with a pulsing amber play button until it is pressed, then returns to "Namish is listening to…".
- The bed is shorter (and nudged left), widening the walkway between its foot and the desk so the guitar corner is easy to reach.
- The bookshelf's page text rises in word by word, the same animation as the About card, instead of typing out. The typewriter module is removed.
- Rewrote the Amsterdam intro so it reads as a love letter to a city you exist in, not a list of sights, instead of sounding like it lacked things to do.
- Sound effects are now real recordings instead of generated noise: carpet footsteps, light key taps, book page flips and a cloth-and-thud record slide, all CC0 from Kenney.nl (licenses in `public/sfx/`). Each kind has several variants that never repeat back to back, with slight pitch changes. About 80 KB in total.
- Leaving is now deliberate and needs no drawn door: a half-circle on the floor at the room's edge shows a "head out" prompt, and walking into the doorway no longer ejects you. Stand in the half-circle and press Space or E, or tap the action button, to leave.
- The tripod, its stool and its camera views moved about 0.3 m into the room, and the post-it wall's standing spot moved in 0.3 m, so no floor ring pokes through the front wall.
- The post-it wall opens straight to browsing: every note is shown as an individual taped post-it with its note count, and an "Add a note" button opens a post-it composer. Escape or an outside tap closes the composer first, then the wall.
- The Instagram icon in the about card links to @nam_yaps (TikTok is @namyaps).
- The travel globe now matches the amber pixel "TRAVEL" title: square pixel land, blocky orange pins, pixel-font labels and a warm backdrop, instead of cold cyan.

### Fixed
- The post-it wall panel was unstyled, so the 3D canvas sat over it and notes could not be posted. The styles were deleted by mistake when the visual effects were removed; they are restored, and `tests/styleCoverage.test.js` now fails if a station's styles go missing.
- Choosing another station from the menu while one is open now closes the open one, waits for the camera to settle, and opens the new one. Before, the request was silently ignored.

## 2026-10-02

### Added
- Post-it wall: a cluster of notes on the left wall opens a panel where visitors read and leave short notes (140 characters, optional name). Notes are stored in the `room_notes` table (Neon) through `api/notes.js`. Posting is limited to 5 notes per hour per visitor, links are rejected, and visitors are identified only by an HMAC of their address. Hide a note with `UPDATE room_notes SET is_hidden = true WHERE id = ...`. Requires `DATABASE_URL` and `NOTES_SALT`; create the table with `scripts/create-notes-table.mjs`.
- Photo wall: clicking the collage or the far half of the desk zooms in on an about card with a portrait, a word-by-word story reveal, Free time and Goals tabs, a résumé button and icon links to Substack, TikTok, Instagram, LinkedIn and email.
- Travel globe: 11 places with photos and written pieces.
- Sound effects: footsteps while walking, key clicks in the terminal, a page turn in the book and a slide when a record is pulled. A menu item turns them off; the choice is remembered.
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
