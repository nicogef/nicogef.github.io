import { readCookie } from './cookie.js';
setBestScore("learn-notes")  
setBestScore("trivia")  
setBestScore("simple-math")

function setBestScore(game) {
    let value = readCookie(game)
    if (value === undefined) {
        return;
    }
    document.getElementById(game).textContent = `Current Best Score: ${value["best-score"]}`;
}