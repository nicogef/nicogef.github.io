const scoreDiv = document.getElementById('score');
const bestScoreDiv = document.getElementById('best-score');

let score = 0;
let bestScore = 0;

export function incrementScore() {
    score++;
    scoreDiv.textContent = `Score: ${score}`;
}

export function clearScore() {
    if (score > bestScore) {
      bestScore = score;
      bestScoreDiv.textContent = `Best Score: ${bestScore}`;
    }
    score = 0;
    scoreDiv.textContent = `Score: ${score}`;
}

export function getScore() {
    return score;
}

export function scoreToJson() {
    return { "score": score, "best-score": bestScore };
}

export function restoreScore(value) {
    if (value === undefined) {
        return;
    }
    if (value.score) {
        score = value.score;
    }
    scoreDiv.textContent = `Score: ${score}`;
    if (value["best-score"]) {
        bestScore = value["best-score"];
        bestScoreDiv.textContent = `Best Score: ${bestScore}`;
    } else {
        bestScoreDiv.textContent = `Best Score: 0`;
    }
}