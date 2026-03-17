# nicogef.github.io

A static game and learning site with a glassmorphism UI, built with vanilla HTML/CSS/JS.

## Live Site

Served via GitHub Pages at **https://nicogef.github.io**

## Local Development

```bash
npm start
```

Opens the site at **http://localhost:9090** using `http-server`.

## Games

| Game | Directory | Description |
|------|-----------|-------------|
| Note Finder | `learn-notes/` | Identify solfege/alphabet notes on a staff |
| Trivia Trainer | `trivia/` | General knowledge quiz |
| Simple Math | `simple-math/` | Mental arithmetic practice |
| Activities | `activities/` | Activity tracking game |

## Project Structure

```
nicogef.github.io/
├── index.html           # Landing page with game tiles
├── css/
│   ├── styles.css       # Global styles (glassmorphism, layout)
│   └── tiles.css        # Landing page tile grid
├── js/
│   ├── index.js         # Landing page score display logic
│   ├── score.js         # Score class and initScore() utility
│   ├── feedback.js      # Correct/wrong feedback helpers
│   └── cookie.js        # Cookie read/write utilities
├── resources/           # Thumbnail images for tiles
├── certificate/         # Certificate page (shared by all games)
├── learn-notes/         # Note Finder game
├── trivia/              # Trivia Trainer game
├── simple-math/         # Simple Math game
└── activities/          # Activities game
```

## How to Add a New Game

1. **Create the game directory** at the repo root:
   ```
   /{game-name}/
   ```

2. **Create `{game-name}.html`** — copy the structure from an existing game:
   - Link `../css/styles.css` and `./{game-name}.css`
   - Include `#score`, `#best-score`, and `#start` elements
   - Add a `#open-cert` button (trophy 🏆) to open the certificate page
   - Load the game script: `<script type="module" src="./{game-name}.js">`

3. **Create `{game-name}.js`** as an ES module:
   - Import `initScore` from `../js/score.js`
   - Import feedback helpers from `../js/feedback.js` if needed
   - Call `const score = initScore("game-name")` to enable cookie-backed persistence
   - Wire the `#start` button and `#open-cert` trophy button

4. **Create `{game-name}.css`** for game-specific styles (inherits global styles).

5. **Add a thumbnail** to `resources/{game-name}-img.jpg`.

6. **Add a tile in `index.html`** — copy an existing `.tile` block and update:
   - `href` → `"./{game-name}/{game-name}.html"`
   - `img src` → `"../resources/{game-name}-img.jpg"`
   - tile title text
   - `id` on `.tile-score` → `"{game-name}"`

7. **Update `js/index.js`** — add `setBestScore("{game-name}")` in both call sites (initial load and `pageshow` handler).

## Verification

After adding a new game:
- `npm start` → landing page shows the new tile
- Click the tile → game loads and plays correctly
- Play the game → score persists after page reload
- Best score appears on the landing page tile after navigating back
