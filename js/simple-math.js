import { correctGuess, incorrectGuess, clearFeedBack } from './feedback.js';
import { incrementScore, clearScore } from './score.js';
const startBtn = document.getElementById('start')
const questionElem = document.getElementById('question');
const AnswerElem = document.getElementById('answer')
const num1Elem = document.getElementById('num1')
const num2Elem = document.getElementById('num2')
let correctAnswer;
let nextRoundTimeout = null

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getSelectedOperation() {
    const operations = document.querySelectorAll('input[type=radio]');
    return Array.from(operations)
                .filter(cb => cb.checked)
                .map(cb => cb.value)[0];
}

function generateQuestion() {
    clearFeedBack();
    clearInterval(nextRoundTimeout)
    AnswerElem.value = '';
    startBtn.innerText = "Restart";
    const operation = getSelectedOperation();

    let num1 = getRandomInt(1, num1Elem.value);
    let num2 = getRandomInt(1, num2Elem.value);

    switch (operation) {
    case 'addition':
        questionElem.innerText = `${num1} + ${num2} = ?`;
        correctAnswer = num1 + num2;
        break;
    case 'subtraction':
        if (num2 > num1) [num1, num2] = [num2, num1]; // avoid negative
        questionElem.innerText = `${num1} - ${num2} = ?`;
        correctAnswer = num1 - num2;
        break;
    case 'multiplication':
        questionElem.innerText = `${num1} × ${num2} = ?`;
        correctAnswer = num1 * num2;
        break;
    case 'division':
        questionElem.innerText = `${num1 * num2} ÷ ${num2} = ?`;
        correctAnswer = num1;
        break;
    }
}

// Handle guess
function submit() {
    if (Number(AnswerElem.value) === correctAnswer) {
        correctGuess();
        incrementScore();
    } else {
        incorrectGuess(`${correctAnswer}`);
        clearScore();
    }
    nextRoundTimeout = setTimeout(generateQuestion, 800);
}

num1Elem.value = 20;
num2Elem.value = 20;
document.getElementById('submit-form')
        .addEventListener('submit', 
                          function(event) {
                            event.preventDefault();
                            submit();
                          });
startBtn.addEventListener('click', generateQuestion);
document.getElementById('add')
        .addEventListener('change', function() {
            if (this.checked) { 
                generateQuestion() 
            }
        });
document.getElementById('sub')
        .addEventListener('change', function() {
            if (this.checked) { 
                generateQuestion() 
            }
        });
document.getElementById('mul')
        .addEventListener('change', function() {
            if (this.checked) { 
                generateQuestion() 
            }
        });
document.getElementById('div')
        .addEventListener('change', function() {
            if (this.checked) { 
                generateQuestion() 
            }
        });