import { storeCookie, readCookie } from '../js/cookie.js';

export function initScore(cookieName) {
    let value = readCookie(cookieName)
    let score = 0
    let bestScore = 0
    if (value) {
        if (value.score) {
            score = value.score;
        }
        if (value["best-score"]) {
            bestScore = value["best-score"];
        }
    }
    return new Score(cookieName, score, bestScore)
}

export class Score {
    constructor(cookieName, score, bestScore) {
        this.cookieName = cookieName;
        this.score = score;
        this.bestScore = bestScore;
        this.scoreDiv = document.getElementById('score');
        this.bestScoreDiv = document.getElementById('best-score');
        this.scoreDiv.textContent = `Score: ${score}`;
        this.bestScoreDiv.textContent = `Best Score: ${bestScore}`;
    }

    incrementScore() {
        this.score++;
        this.scoreDiv.textContent = `Score: ${this.score}`;
        storeCookie(this.cookieName, this.scoreToJson());
    }

    clearScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreDiv.textContent = `Best Score: ${this.bestScore}`;
        }
        this.score = 0;
        this.scoreDiv.textContent = `Score: ${this.score}`;
        storeCookie(this.cookieName, this.scoreToJson());
    }

    scoreToJson() {
        return { "score": this.score, "best-score": this.bestScore };
    }

    openCertificate() {
        const name = encodeURIComponent(this.cookieName);
        const bestScore = encodeURIComponent(`${this.bestScore}`);
        window.open(`../certificate/certificate.html?name=${name}&score=${bestScore}`, '_blank');
    }
}