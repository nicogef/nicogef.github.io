# nicogef.github.io — Developer Context

## Tech Stack

- **Vanilla HTML/CSS/JS** — no build step, no framework, no bundler
- **ES modules** — `type="module"` scripts, relative imports only
- **http-server** — local dev via `npm start` (port 9090)
- **GitHub Pages** — production hosting, served from `master` branch root

## Project Layout

```
nicogef.github.io/
├── index.html           # Landing page (game tile grid)
├── css/
│   ├── styles.css       # Global glassmorphism styles, shared layout
│   └── tiles.css        # Landing page tile grid
├── js/
│   ├── cookie.js        # readCookie(name) / storeCookie(name, obj)
│   ├── score.js         # Score class + initScore(cookieName) factory
│   ├── feedback.js      # showFeedback(correct|wrong) helpers
│   └── index.js         # Landing page: reads cookies → tile score display
├── resources/           # Tile thumbnail images
├── certificate/         # Shared certificate page (opened by all games)
├── learn-notes/         # Note Finder game
├── trivia/              # Trivia Trainer game
├── simple-math/         # Simple Math game
└── activities/          # Activities game
```

Each game lives in its own directory and is self-contained:
```
{game-name}/
├── {game-name}.html
├── {game-name}.js
└── {game-name}.css
```

## Shared Utilities

### `js/score.js`

```js
import { initScore } from '../js/score.js';

const score = initScore('game-name'); // reads cookie, renders #score and #best-score
score.incrementScore();               // +1, persists to cookie
score.clearScore();                   // resets round, updates best-score if exceeded
score.openCertificate();              // opens certificate page with best score
```

`initScore` expects the DOM to have `#score` and `#best-score` elements.

### `js/cookie.js`

```js
import { readCookie, storeCookie } from '../js/cookie.js';

const data = readCookie('game-name');       // returns parsed JSON object or undefined
storeCookie('game-name', { key: value });   // serializes object to cookie
```

Cookie value format used by the score system: `{ "score": N, "best-score": N }`.

### `js/feedback.js`

Provides visual feedback helpers. Import and call as needed in game logic.

## Game HTML Template

Every game HTML file follows this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Game Title</title>
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="./{game-name}.css">
</head>
<body>
  <div class="background"></div>
  <div class="blur-container"></div>
  <div class="container">
    <h1>Game Title <button class="print-btn" id="open-cert">&#129351;</button></h1>
    <div class="header-row">
      <div class="status-bar">
        <p class="score"><span id="score"></span></p>
        <p class="score"><span id="best-score"></span></p>
        <button id="start" class="start-btn">Start Game</button>
      </div>
    </div>
    <!-- game-specific content here -->
  </div>
  <script type="module" src="./{game-name}.js"></script>
</body>
</html>
```

## Landing Page Wiring

`index.html` has one `.tile` per game:

```html
<a href="./{game-name}/{game-name}.html" class="tile">
  <img src="../resources/{game-name}-img.jpg" alt="{game-name}-img" />
  <div class="tile-content">
    <h2 class="tile-title">Display Name</h2>
    <p class="tile-score" id="{game-name}"></p>
  </div>
</a>
```

`js/index.js` reads each game's cookie and populates the `.tile-score` element:

```js
setBestScore("{game-name}")  // reads cookie → sets textContent on #game-name element
```

Add `setBestScore("{game-name}")` in **two places** in `js/index.js`:
1. At the bottom of the file (initial page load)
2. Inside the `pageshow` handler (back/forward cache restore)

## How to Add a New Game

1. Create `/{game-name}/` directory at repo root.
2. Create `{game-name}.html` using the template above.
3. Create `{game-name}.js`:
   ```js
   import { initScore } from '../js/score.js';

   const score = initScore('game-name');

   document.getElementById('start').addEventListener('click', () => {
     score.clearScore();
     // start game logic
   });

   document.getElementById('open-cert').addEventListener('click', () => {
     score.openCertificate();
   });
   ```
4. Create `{game-name}.css` (can be empty; inherits `styles.css`).
5. Add `resources/{game-name}-img.jpg` thumbnail.
6. Add tile in `index.html` (copy existing `.tile` block, update href/img/title/id).
7. Add `setBestScore("{game-name}")` in both locations in `js/index.js`.

## URL Structure

No router. URLs are directory-based:
- Landing page: `/` or `/index.html`
- Game: `/{game-name}/{game-name}.html`
- Certificate: `/certificate/certificate.html?name=...&score=...`

## Score Persistence

Scores are stored in browser cookies as JSON. The cookie name is the game name string passed to `initScore()`. The `index.js` on the landing page reads the same cookie to display the best score on each tile.
