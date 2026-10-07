# Changelog

## 2026-10-07

### Added
- Click (or tap) any glowing object, or its circle on the floor, and the avatar walks over to it, around the furniture, and opens it on arrival. Pressing a movement key or the joystick mid-walk cancels it. `scripts/check-walkable.mjs` now also checks there's a route from spawn to every object.
- How-to-explore instructions docked top-left the whole time you're in the room: walk, go to, open, back. On phones it folds into a "?" button, and the music widget leaves that corner free. It replaces the WASD toast that faded after five seconds.
- A "This portfolio" card at the top of the laptop's projects: three.js and Vite, 3D assets made with Astra in Blender, Spotify and Neon Postgres behind Vercel functions.
- The laptop's welcome now says "type `cat resume` to download my resume."

### Changed
- The floor circles are easier to spot. Four styles to compare with `?rings=`: `ripple` (default; thicker, brighter, with a ring spreading outward), `bold`, `glow` (the disc inside fills with light) and `subtle` (the old look).
- The ☰ menu is gone; you get around by walking or clicking. Its sound effects switch is now a speaker button, top right.

## 2026-10-03

### Added
- Amsterdam: two new photos, Van Gogh's Almond Blossom and an arched-door townhouse with bikes.
- Amritsar: a fourth photo, the jalebi stall.
- Kangra: new photos of the temple Buddha and the prayer wheels.

### Changed
- Hà Giang: "my nights chatting with old and new friends" (was "talking").
- Hà Giang: "met a ton of new people from all over the world" (was "all over the United States and the world").
- About: removed "Feel free to click around."
- About: the story opens with being fascinated by "what makes people tick".
- Laptop: the file explorer no longer lists a readme.md (it opened nothing).
- About: removed the paragraph about creative and professional work from the story.
- Music status: when Namish isn't listening, the card keeps the live layout (dot plus bold uppercase line) in red, "Namish isn't listening to music right now", with no song or cover; on phones the line wraps evenly.
- Laptop typing sound: the key clicks are now real keyboard recordings (a Cherry keyboard, CC0 pack by unicaegames), eight variants trimmed to the keystroke and matched in loudness. The old clips were a low impact thud that didn't sound like a keyboard.
- About: the story ends with an invitation to reach out and say hi.
- Laptop: clicking outside an open project card closes it and returns to the terminal (it used to need Escape).
- Pantry check-in project: says its backend was built test-first (TDD) instead of quoting test counts and coverage.
- Music: the top-right card now only shows what Namish is listening to on Spotify ("Namish is listening to" with the song, or "Namish isn't listening to music right now."), refreshed every 30 seconds; it no longer plays anything, links to the song, or shuffles his playlists. Visitors play music from the vinyl instead: "Play this one" opens a separate record-player pop-up under the card (rank, song, play/pause, stop), which moves on to the next of the top 10 when a record ends and stops after #10. `/api/now-playing` now returns only the live track, dropping the playlist fetch. Removed the unused Spotify hint markup.
- Fashion: the striped button down no longer adds a gold chain and white tank top to the avatar.
- Fashion: clicking the room around the panel closes it, like the other stations.
- `style.css` (2,016 lines) is split into one file per station under `src/styles/`, imported in cascade order. Verified with a computed-style comparison of every element across 22 states (door, room and each station, desktop and phone): no differences.
- Fashion internals: putting on an outfit is one `dress(outfit)` call (`avatarWardrobe.js`) covering rigged garments, the recolored built-in clothes (now `baseClothes.js`) and the chain and tank top; `outfits.js` is pure outfit data again, and the closet installs with one `installCloset` call.
- Music card internals: seven interacting flags are replaced by two explicit states, what the visitor wants (idle, playing, paused) and what the embed is doing (starting, loading a track, choosing the next, ready). The resume and play-on-load decisions live in `playbackPolicy.js` with unit tests. Checked against the real Spotify embed: play, pause (stays paused), playing from the crate, and leaving the crate.
- Code structure (no visible change): `world.js` is split into `roomLayout.js` (model corrections and the tripod stool), `collision.js` (pure obstacle boxes and wall-sliding movement, now unit-tested) and `entrance.js` (hallway and door). The record crate's 3D shelf moved to `recordShelf.js`, leaving `crateDigging.js` with the controls and the Spotify list. The player gets its collider directly instead of reading a shared mutable `OBSTACLES` array. `scripts/check-walkable.mjs` now imports the game's own layout, furniture and collision code instead of copying it (and regex-reading `world.js`), so it also accounts for the desk chair it used to miss. `main.js` advances each stage from a table, shows the touch controls when the stage changes, and redraws the hotspot prompt only when it changes rather than every frame.
- Stations now live in one registry (`src/stations.js`): each entry gives its camera spot, what it opens, and how to close it or step back a layer. A panel's `open()` resolves when it closes (`exitSignal.js`), so `main.js` has one visit flow instead of per-station if-chains, and switching stations from the menu waits for the close rather than polling with retries and timeouts (which could lose the race and leave the next station unopened). Music resumes as each visit ends instead of being checked every frame. The travel globe now counts as a visit like the others.
- Code cleanup (no visible change): shared helpers replace copies spread across modules — element lookup, touch detection, pointer-to-3D conversion and animation restart in `dom.js`; all easing and the slide-out-then-turn pose in `motion.js`; safe `localStorage` reads and writes in a new `storage.js`. Removed unused exports and fields (`OVERHEAD_VIEW`, `GITHUB_URL`, `PORTFOLIO_URL`, `Player.setVisible`, the door's `slab` and `knob`).
- The page title and link previews (iMessage, Slack and so on) now read "Namish’s Room" instead of "Room".
- Avatar and wardrobe updated to Namish-Wearables 1.4: a leaner athletic build (face, hair, hands and animations unchanged) and all garments refitted to it, plus a black SKIMS tee for the Skims piece. The Prince vest now comes with its own white tee, so the hand-built `white-tee.glb` and its builder are removed. The built-in clothes are recolored by their slot tags, which now only matters for the light blue jeans; the unused pinstripe shader is gone. The avatar is quantized (11.1 MB → 7.4 MB) and a test checks it matches the manifest's hash and body fit. Garment photos re-rendered.
- Bookshelf: the book text is set in the Kalam handwriting font and the "My top 5 books of all time" title in Gochi Hand.
- Fashion: removed "It's very important to me" from the intro note.
- Seattle: removed "but somehow they do".
- Chicago: the Evanston lakefront selfie shows in full (4:3) instead of being cropped to a portrait box that cut off a friend; photos can opt in with `isWide`.
- Amritsar: "The serenity I felt at the Golden Temple was irreplaceable" (was "immaculate").
- Travel writing, reviewed place by place against the earlier versions. Restored the earlier, closer-to-the-original wording for Seattle, Chiang Mai, Hà Giang, Kangra, Amritsar, Kerala and Copenhagen, with a few requested tweaks: "plenty of nights of liquid mischief" (Chiang Mai), the Kangra opening paragraph now ends on the Dalai Lama line, Amritsar says kirtan and drops "One moment stands out", Kerala uses a hostels, beach and tea plantations sentence and the "each state brings its own food, culture and mentality" line, and Copenhagen ends on "sitting with your thoughts". Chicago, Madrid, the Dolomites and Amsterdam stay as they were.
- Fashion: the Prince vest is worn over a plain white tee with bare forearms (`white-tee.glb`, built by `scripts/wardrobe/` from the sweatshirt's rig) instead of the striped shirt. Each piece's picture is now a rendered still of its 3D garment; tapping it opens the interactive 3D view.
- Fashion: the avatar now actually wears the pieces. Seven rigged garments from the Namish-Wearables package (striped shirt, Northwestern sweatshirt, Prince vest worn over the striped shirt, Urban Indian sweatshirt, tan corduroys, indigo jeans, charcoal trousers) bind to the avatar's skeleton, so they walk and sit with it, and replace the built-in sweater and jeans. The Skims tee and light blue jeans have no garment yet and still recolor the built-in clothes. Each piece's panel shows that same garment as a 3D model you can drag to turn, with an enlarge button for a full-screen view; the earlier photo-derived models and their `scripts/garments/` builder are removed.
- Madrid: photos reordered so streets, buildings, the café and the park class alternate.
- Amsterdam: the last photo is now the student band playing at the bar, replacing the wall of instant photos.
- Kangra: the first photo is now the pink sunrise over the peaks, and the street-with-power-lines photo is removed.

### Fixed
- Fashion: long piece names no longer break mid-word ("NORTHWESTERN" split across two lines on desktop); the name tops out at 20 px so the longest word fits its column.
- Music card: a record picked from the crate before the Spotify player had finished loading showed on the card but the player loaded the original song; the player now switches to the picked song once it is ready.
- The record crate no longer sits on "Pulling records…" forever when the network request fails outright; it shows the Spotify error line. The music card likewise copes with the listening request failing instead of throwing.
- Missing room-model parts now stop the build loudly (`requireNode`) instead of being skipped silently; every part the code looks up was checked to exist in `room.glb`.
- Fashion section on phones: the outfit buttons are now 44 px tall (they were 38 px) and Done is wider, so they are easier to tap.

### Changed
- The closet is now a "Fashion" section: a pixel FASHION header scrambles in with a short note on why style matters, then eight pieces, each with its own story and, where available, a photo you can tap to enlarge: striped Polo button down (with a visible chain and white tank top, pinstripes on the avatar), Northwestern Rose Bowl hoodie, Prince sweater vest, The Urban Indian hoodie, Skims black tee, brown corduroy pants, Levi's straight-leg jeans, light blue jeans and brown trousers. The Skims tee and light blue jeans have no photo yet and show a color swatch. The earlier placeholder pieces are gone, and an outfit saved from them falls back to the default.
- The bookshelf's text, labels and buttons use the Fraunces serif from the About card heading.
- The About card photo is now the same picture as the creative portfolio's (black shirt, Chicago skyline at dusk), cropped the way that site frames it.

### Fixed
- Music: the next song now always starts. Spotify reports progress about once a second, so the last update of a clip could land more than 0.75 s before its end and the music went quiet until play was pressed. A track now also counts as finished when it rewinds to the start, and the end window is 1.8 s. Covered by `tests/trackEnd.test.js`.
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
