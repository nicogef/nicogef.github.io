import { correctGuess, incorrectGuess, tooSlow, clearFeedBack } from '../js/feedback.js';
import { initScore } from '../js/score.js';
import { storeCookie, readCookie } from '../js/cookie.js';


// Data
const semitone = 6;
const toneDistance = semitone * 2;
const notePerOctave = 7;
const ledgerLow = -3;
const ledgerHigh = 9;
const referenceFrequency = 440.00;
const alphabet = ["C", "D", "E", "F", "G", "A", "B"];

// State
let note = 0;
let animationId = null;
let nextRoundTimeout = null
let roundActive = false;
let speedSetting = 1; // Default speed
let syllables;

class Clef {
  constructor(name, sign, baseOctave, referencePosition, lowerNote, higherNote, octaves) {
    this.name = name;
    this.sign = sign;
    this.baseOctave = octaves.indexOf(baseOctave);
    this.referencePosition = referencePosition;
    this.lowerNote = lowerNote;
    this.higherNote = higherNote;
    this.octaves = octaves;
  }
  randomNote(octaveSetting) {
    this.note = Math.floor(Math.random() * notePerOctave);
    // Calculate note position
    this.position = this.note - this.referencePosition + notePerOctave * (this.octaves.indexOf(octaveSetting) - this.baseOctave);
    // Calculate Y position based on f0
    this.y = xA4 - this.position * semitone;
    this.frequency = referenceFrequency * Math.pow(2, this.position / 12);
    return new Note(this.note, this.position, this.y, this.frequency);
  }
}
const syllablesNames =
{
  "solfege" : ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"],
  "alphabet": alphabet
}
const clefs = 
{
  "treble" : new Clef("treble", "𝄞", "First Octave", 3, -8, 15, ["Small Octave", "First Octave", "Second Octave", "Third Octave"]),
  "bass": new Clef("bass", "𝄢", "Small Octave", -2, -19, -1, ["Great Octave", "Small Octave", "First Octave"])
}

let syllablesName;
let clef;
let octaves;


// DOM
const canvas = document.getElementById('noteDisplay');
const ctx = canvas.getContext('2d');
// const buttonsDiv = document.getElementById('buttons');
const startButton = document.getElementById('start');
const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');
const xA4 = canvas.height / 3 + 3.5 * toneDistance

// Draw staff
function drawStaff() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#444";
  for (let i = 0; i < 5; i++) {
    const y = canvas.height / 3 + i * toneDistance
    drawLine(20, y, 360)
  }
  ctx.font = "80px serif";
  ctx.fillStyle = "#000000";
  ctx.fillText(clefs[clef].sign, 10, canvas.height / 3 + 4 * toneDistance); // Position for treble clef on G4 (Sol) or bass clef F3 (Fa)
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
  let noteX = canvas.width - 30;
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
      tooSlow(syllables[note.note]);
      nextRoundTimeout = setTimeout(newRound, 800);
    }
  }
  if (animationId) cancelAnimationFrame(animationId);
  frame();
}

// New round
function newRound() {
  roundActive = true;
  clearFeedBack()
  note = clefs[clef].randomNote(octaves[clef]);
  animateNote(note);
}

// Handle guess
function guess(actual) {
  if (!roundActive) return;
  if (animationId) cancelAnimationFrame(animationId);
  roundActive = false;
  if (actual === note.note) {
    note.play();
    score.incrementScore()
    correctGuess();
  } else {
    score.clearScore();
    incorrectGuess(syllables[note.note]);
  }
  nextRoundTimeout = setTimeout(newRound, 800);
}

function endGame() {
  roundActive = false;
  score.clearScore();
  clearFeedBack();
  clearInterval(nextRoundTimeout)
}

function startGame() {
  endGame();
  startButton.innerText = "Restart";
  nextRoundTimeout = setTimeout(newRound, 500);
}

// Speed slider logic
speedRange.addEventListener('input', function() {
  speedSetting = this.value;
  speedValue.textContent = speedSetting;
  speedRange.value = speedSetting;
});

class Note {
  constructor(note, position, y, frequency) {
    this.note = note;
    // Calculate note position
    this.position = position;
    // Calculate Y position based on f0
    this.y = y;
    this.frequency = frequency;
    console.log(`Index: ${this.note} for note: ${this.position}`);
  }
  play() {
    playPianoNote(this.frequency);
  }
  // Draw note at position
  drawAt(x) {
    ctx.beginPath();
    ctx.ellipse(x, this.y, semitone + 1, semitone, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#3498db";
    ctx.fill();
    ctx.strokeStyle = "#222";
    ctx.stroke();

    drawLedgerLines(x, note);
  }
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

function initClef(clefName) {
  updateClef(clefName);
  const clefsElement = document.getElementById("clefs");
  Object.values(clefs).forEach(item => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'clef';
      radio.value = item.name;
      if (clef === item.name) {
        radio.checked = true;
      } 

      radio.addEventListener('change', function() {
        if (this.checked) {
          updateClef(this.value);
          storeConfig();
          newRound()
        }
      });
      label.appendChild(radio);
      label.appendChild(document.createTextNode(item.sign));
      clefsElement.appendChild(label);
      clefsElement.appendChild(document.createElement('br'));
  });
}

function initOctaves(clefName) {
  const octavesElement = document.getElementById('octaves');
  const currentClef = clefs[clefName];
  const octaveName = octaves[clefName];
  octavesElement.innerHTML = '';
  currentClef.octaves.map(item => {
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'octave';
      radio.value = item;
      if (octaveName === item) {
        radio.checked = true;
      } 

      radio.addEventListener('change', function() {
        if (this.checked) {
          octaves[clef] = this.value;
          updateOctaves(octaves);
          storeConfig();
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

function initState() {
  let value = readCookie("learn-notes-options");
  updateSyllables(value.syllables ? value.syllables : "alphabet");
  let clefName = value.clef ? value.clef : "treble";
  if (value.octaves) {
    octaves = value.octaves;
  } else {
    updateOctaves({ 
      "treble" : clefs["treble"].octaves[clefs["treble"].baseOctave], 
      "bass" : clefs["bass"].octaves[clefs["bass"].baseOctave] 
    })
  }
  initClef(clefName);
  storeConfig();
}

// Initial setup
initState();
const score = initScore("learn-notes");
startGame()
startButton.addEventListener('click', startGame);

document.querySelectorAll('.white-key, .black-key').forEach(key => {
  key.addEventListener('mousedown', () => {
    let note = alphabet.indexOf(key.getAttribute('data-note'))
    guess(note)
  });
});
document.getElementsByName('notation').forEach(key => {
        key.addEventListener('change', function() {
            if (this.checked) { 
                updateSyllables(this.id)
                storeConfig();
            }
        });
      });
document.getElementById('open-cert').onclick = function() {
  score.openCertificate();
};

function updateOctaves(newOctaves) {
  octaves = newOctaves;
}

function updateClef(newClef) {
  clef = newClef;
  initOctaves(clef);
}

function updateSyllables(newSyllables) {
  syllablesName = newSyllables
  syllables = syllablesNames[syllablesName];
  document.getElementById(syllablesName).checked = true;
  document.querySelectorAll('.white-key, .black-key').forEach(key => {
    let note = alphabet.indexOf(key.getAttribute('data-note'))
    if (syllables[note]) {
      key.innerHTML = syllables[note];
    }
  });
}

function storeConfig() {
  storeCookie("learn-notes-options", 
    { 
      "syllables" : syllablesName,
      "clef" : clef,
      "octaves" : octaves
    });
                
}
speedValue.textContent = speedSetting;
speedRange.value = speedSetting;
