import { readCookie } from './cookie.js';

function setBestScore(game) {
    let value = readCookie(game)
    if (value === undefined) {
        return;
    }
    document.getElementById(game).textContent = `Current Best Score: ${value["best-score"]}`;
}

window.addEventListener('pageshow', function (event) {
  const navigation = performance.getEntriesByType("navigation")[0];
  if (event.persisted || (navigation && navigation.type === "back_forward")) {
    setBestScore("learn-notes")  
    setBestScore("trivia")  
    setBestScore("simple-math")
  }
});

setBestScore("learn-notes")  
setBestScore("trivia")  
setBestScore("simple-math")