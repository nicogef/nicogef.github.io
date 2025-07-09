import { correctGuess, incorrectGuess, clearFeedBack } from '../js/feedback.js';
import { incrementScore, clearScore, scoreToJson, restoreScore } from '../js/score.js';
import { storeCookie, readCookie } from '../js/cookie.js';

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

    let num1 = getRandomInt(0, num1Elem.value);
    let num2 = getRandomInt(0, num2Elem.value);

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
        if (num1 === 0 && num2 === 0) {
            generateQuestion();
        } else if (num2 === 0) {
            questionElem.innerText = `${num1 * num2} ÷ ${num1} = ?`;
            correctAnswer = num2;
        } else {
            questionElem.innerText = `${num1 * num2} ÷ ${num2} = ?`;
            correctAnswer = num1;
        }
        break;
    }
}

// Handle guess
function submit() {
    if (AnswerElem.value != "" && Number(AnswerElem.value) === correctAnswer) {
        correctGuess();
        incrementScore();
    } else {
        incorrectGuess(`${correctAnswer}`);
        clearScore();
    }
    storeCookie("simple-math", scoreToJson())
    nextRoundTimeout = setTimeout(generateQuestion, 800);
}

num1Elem.value = 20;
num2Elem.value = 20;
let value = readCookie("simple-math")
restoreScore(value)

document.getElementById('submit-form')
        .addEventListener('submit', 
                          function(event) {
                            event.preventDefault();
                            submit();
                          });
startBtn.addEventListener('click', () => {
        clearScore();
        storeCookie("simple-math", scoreToJson())
        generateQuestion();
    });
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