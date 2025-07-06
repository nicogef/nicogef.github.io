const scoreDiv = document.getElementById('score');
const bestScoreDiv = document.getElementById('best-score');

let score = 0;
let bestScore = 0;

export function incrementScore() {
    score++;
    scoreDiv.textContent = `${score}`;
}

export function clearScore() {
    if (score > bestScore) {
      bestScore = score;
      bestScoreDiv.textContent = `${bestScore}`;
    }
    score = 0;
    scoreDiv.textContent = `${score}`;
}

export function getScore() {
    return score;
}