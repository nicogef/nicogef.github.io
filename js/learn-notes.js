// Data
const semitone = 6;
const roundDuration = 120;
const syllables = ["Do (C", "Re (D", "Mi (E", "Fa (F", "Sol (G", "La (A", "Si (B"];
const formatNote = note => note + `${octaves.indexOf(octaveSetting)})`
const trebleClef = new Clef("𝄞", "First Octave", 3, -8, 15, ["Small Octave", "First Octave", "Second Octave", "Third Octave"])
const bassClef = new Clef("𝄢", "Small Octave", -2, -19, -1, ["Great Octave", "Small Octave", "First Octave"])
const clefs = [trebleClef, bassClef]
const octaves = ["Sub-Contra Octave", "Contra-Octave", "Great Octave", "Small Octave",
                 "First Octave", "Second Octave", "Third Octave", "Fourth Octave"]

// State
let clef = 0;
let note = 0;
let score = 0;
let animationId = null;
let timeLeft = roundDuration;
let timerInterval = null;
let nextRoundTimeout = null
let roundActive = false;
let speedSetting = 1; // Default speed
let octaveSetting = "First Octave"; // Default octave
let bestScore = 0;

function Clef(clef, baseOctave, referencePosition, lowerNote, higherNote, octaves) {
  this.clef = clef
  this.baseOctave = octaves.indexOf(baseOctave)
  this.referencePosition = referencePosition
  this.lowerNote = lowerNote
  this.higherNote = higherNote
  this.octaves = octaves
}

Clef.prototype.randomNote = function randomNote(octaveSetting) {
  this.note = Math.floor(Math.random() * notePerOctave);
  // Calculate note position
  
  this.position = this.note - this.referencePosition + notePerOctave * (this.octaves.indexOf(octaveSetting) - this.baseOctave);
  // Calculate Y position based on f0
  this.y =  xA4 - this.position * semitone;
  this.frequency = referenceFrequency * Math.pow(2, this.position / 12);
  return new Note(this.note, this.position, this.y, this.frequency)
}

// DOM
const canvas = document.getElementById('noteDisplay');
const ctx = canvas.getContext('2d');
const feedbackDiv = document.getElementById('feedback');
const scoreDiv = document.getElementById('score');
const bestScoreDiv = document.getElementById('bestScore');
const buttonsDiv = document.getElementById('buttons');
const timerDiv = document.getElementById('timer');
const restartBtn = document.getElementById('restartBtn');
const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');
// const octaveRange = document.getElementById('octaveRange');
// const octaveValue = document.getElementById('octaveValue');

const toneDistance = semitone * 2;
const notePerOctave = 7;
const ledgerLow = -3;
const ledgerHigh = 9;
const referenceFrequency = 440.00;
const xA4 = canvas.height / 3 + 3.5 * toneDistance

// Draw staff
function drawStaff() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#444";
  for (let i = 0; i < 5; i++) {
    y = canvas.height / 3 + i * toneDistance
    drawLine(20, y, 360)
  }
  ctx.font = "80px serif";
  ctx.fillStyle = "#000000";
  ctx.fillText(clef.clef, 10, canvas.height / 3 + 4 * toneDistance); // Position for treble clef on G4 (Sol) or bass clef F3 (Fa)
}

function drawLine(x, y, xlength) {
    ctx.beginPath();
    ctx.moveTo(x - xlength, y);
    ctx.lineTo(x + xlength, y);
    ctx.stroke();
}

function drawLedgerLines(x, note) {
  for (let i = ledgerLow; i > note.position - 1; i=i-2) {
    drawLine(x, xA4 - i * semitone, toneDistance)
  }  
  for (let i = ledgerHigh; i <= note.position; i=i+2) {
    drawLine(x, xA4 - i * semitone, toneDistance)
  }
}

// Animate note and monitor answer
function animateNote(note) {
  noteX = canvas.width - 30;
  const speed = Number(speedSetting/10);

  function frame() {
    if (!roundActive) return; // Stop if round is over
    drawStaff();
    note.drawAt(noteX);
    noteX -= speed;
    if (noteX > 70) {
      animationId = requestAnimationFrame(frame);
    } else {
      // Time's up for this note, auto-wrong if still waiting
      roundActive = false;
      setupButtons(roundActive);
      incorrectGuess(note);
  }
  }
  if (animationId) cancelAnimationFrame(animationId);
  frame();
}


// Set up buttons
function setupButtons(enabled = true) {
  buttonsDiv.innerHTML = '';
  octaveNumber = octaves.indexOf(octaveSetting)
  syllables
    .map(item => formatNote(item))
    .forEach((syll, idx) => {
      const btn = document.createElement('button');
      btn.textContent = syll;
      btn.disabled = !enabled;
      btn.onclick = () => guess(idx, btn);
      buttonsDiv.appendChild(btn);
    });
}

// New round
function newRound() {
  roundActive = true;
  setupButtons(roundActive);
  feedbackDiv.textContent = '';
  note = clef.randomNote(octaveSetting);
  animateNote(note);
}

// Handle guess
function guess(actual, btn) {
  if (!roundActive) return;
  roundActive = false;
  setupButtons(roundActive);
  if (actual === note.note) {
    correctGuess(note);
  } else {
    incorrectGuess(note);
  }
  nextRoundTimeout = setTimeout(newRound, 800);
}

function clearScore() {
    if (score > bestScore) {
      bestScore = score;
      bestScoreDiv.textContent = `Best Score: ${bestScore}`;
    }
    score = 0;
    scoreDiv.textContent = `Score: ${score}`;
}

function correctGuess(note) {
    score++;
    note.play();
    octaveNumber = octaves.indexOf(octaveSetting)
    feedbackDiv.textContent = "✅ Correct! " + formatNote(syllables[note.note]);
    feedbackDiv.style.color = "#27ae60";
    scoreDiv.textContent = `Score: ${score}`;
}

function incorrectGuess(note) {
    clearScore();
    feedbackDiv.textContent = "❌ Incorrect. It was " + formatNote(syllables[note.note]);
    feedbackDiv.style.color = "#c0392b";
}

//// Timer logic
//function startTimer() {
//  timeLeft = roundDuration;
//  timerDiv.textContent = `Time: ${timeLeft}`;
//  timerInterval = setInterval(() => {
//    timeLeft--;
//    timerDiv.textContent = `Time: ${timeLeft}`;
//    if (timeLeft <= 0) {
//      endGameOnTimer();
//    }
//  }, 1000);
//}

function endGameOnTimer() {
  endGame();
  feedbackDiv.textContent = `Time's up! Final score: ${score}`;
  feedbackDiv.style.color = "#2980b9";
}

function endGame() {
  roundActive = false;
  setupButtons(roundActive);
  clearScore();
  clearInterval(timerInterval);
  clearInterval(nextRoundTimeout)
}

function startGame() {
  endGame();
  feedbackDiv.textContent = '';
  feedbackDiv.style.color = "#222";
  clef = trebleClef
//  startTimer();
  nextRoundTimeout = setTimeout(newRound, 500);
}

// Speed slider logic
speedRange.addEventListener('input', function() {
  speedSetting = this.value;
  speedValue.textContent = speedSetting;
  speedRange.value = speedSetting;
});

function Note(note, position, y, frequency) {
  this.note = note
  // Calculate note position
  this.position = position;
  // Calculate Y position based on f0
  this.y = y;
  this.frequency = frequency;
  console.log(`Index: ${this.note} for note: ${this.position}`);
}
Note.prototype.play = function play() {
  playPianoNote(this.frequency)
}
  // Draw note at position
Note.prototype.drawAt = function drawAt(x) {
    ctx.beginPath();
    ctx.ellipse(x, this.y, semitone + 1, semitone, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#3498db";
    ctx.fill();
    ctx.strokeStyle = "#222";
    ctx.stroke();

    drawLedgerLines(x, note)
  }

function playPianoNote(frequency) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Create oscillator and gain nodes
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  // Set oscillator type to 'triangle' for a softer tone (piano-like)
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  // Connect oscillator -> gain -> destination
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Create a quick attack and decay envelope to simulate piano
  const now = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(1, now + 0.01); // quick attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5); // decay

  // Start and stop oscillator
  oscillator.start(now);
  oscillator.stop(now + 1.5);

  // Cleanup oscillator after stopping
  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
  };
}

function initClef() {
  clef = trebleClef
  clefsElement = document.getElementById("clefs")
  clefs.map(item => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'clef';
      radio.value = item.clef;
      if (clef.clef === item.clef) {
        radio.checked = true;
      } 

      radio.addEventListener('change', function() {
        if (this.checked) {
          octaveSetting = clef.octaves[clef.baseOctave];
          clef = item
          setOctaves(item);
          newRound()
        }
      });
      label.appendChild(radio);
      label.appendChild(document.createTextNode(item.clef));
      clefsElement.appendChild(label);
      clefsElement.appendChild(document.createElement('br'));
  });
  setOctaves(clef)
}

function setOctaves(newClef) {
  clef = newClef;
  octavesElement = document.getElementById('octaves');
  octavesElement.innerHTML = '';
  clef.octaves.map(item => {
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'octave';
      radio.value = item;
      if (clef.octaves[clef.baseOctave] === item) {
        radio.checked = true;
          octaveSetting = item;
      } 

      radio.addEventListener('change', function() {
        if (this.checked) {
          octaveSetting = this.value;
          newRound();
        }
      });
      const label = document.createElement('label');
      label.appendChild(radio);
      label.appendChild(document.createTextNode(item));
      octavesElement.appendChild(label);
      octavesElement.appendChild(document.createElement('br'));
  });
}

// Initial setup
initClef()
startGame();

speedValue.textContent = speedSetting;
speedRange.value = speedSetting;
