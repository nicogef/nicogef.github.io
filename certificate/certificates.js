// Helper to get query parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Set initial values from URL if present
window.addEventListener('DOMContentLoaded', function() {
    const gameFromURL = getQueryParam('name');
    const scoreFromURL = getQueryParam('score');
    if (gameFromURL) {
    document.getElementById('game').textContent = gameFromURL;
    }
    if (scoreFromURL) {
    document.getElementById('score').textContent = scoreFromURL;
    }
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = today.toLocaleDateString(undefined, options)
});

// Live update fields
document.getElementById('recipientInput').addEventListener('input', function() {
    document.getElementById('recipientDisplay').textContent = this.value || ' ';
});
document.getElementById('signatureInput').addEventListener('input', function() {
    document.getElementById('signatureDisplay').textContent = this.value || ' ';
});