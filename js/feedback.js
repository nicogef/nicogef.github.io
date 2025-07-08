const feedbackDiv = document.getElementById('feedback');

export function clearFeedBack() {
  feedbackDiv.textContent = '';
}

export function correctGuess() {
    feedbackDiv.textContent = "✅ Correct! ";
    feedbackDiv.style.color = "#27ae60";
}

export function incorrectGuess(msg) {
    feedbackDiv.textContent = "❌ Incorrect. It was " + msg;
    feedbackDiv.style.color = "#c0392b";
}


export function tooSlow(msg) {
    feedbackDiv.textContent = "❌ Too Slow. It was " + msg;
    feedbackDiv.style.color = "#c0392b";
}

export function stopOnTimer(msg) {
    feedbackDiv.textContent = "Timer is Finished: " + msg;
    feedbackDiv.style.color = "#27ae60";
}