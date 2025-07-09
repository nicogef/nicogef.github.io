import { correctGuess, incorrectGuess, stopOnTimer, clearFeedBack } from '../js/feedback.js';
import { incrementScore, clearScore, scoreToJson, restoreScore } from '../js/score.js';
import { storeCookie, readCookie } from '../js/cookie.js';

let questions = []
async function fetchQuestions() {
  try {
    const response = await fetch('../resources/trivia-questions.json');
    if (!response.ok) throw new Error('Network response was not ok');
    questions = await response.json(); // Store in array
  } catch (error) {
    console.error('Error fetching JSON:', error);
  }
}

await fetchQuestions();

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

let shuffledQuestions = [];
let currentQuestionIndex = 0;
let category = "";

const categoryElem = document.getElementById('category');
const questionElem = document.getElementById('question');
const answerButtons = document.querySelectorAll('.answer');
const progressElem = document.getElementById('progress');
const startButton = document.getElementById('start');

function startGame() {
  clearScore();
  currentQuestionIndex = 0;
  startButton.innerText = "Restart";
  shuffledQuestions = [...questions.filter(q => q.category === category)];
  shuffle(shuffledQuestions);
  loadQuestion();
}

function loadQuestion() {
  clearFeedBack()
  const questionData = shuffledQuestions[currentQuestionIndex];
  categoryElem.innerText = `Category: ${questionData.category}`;
  questionElem.innerText = questionData.question;
  const shuffledAnswers = [...questionData.options];
  shuffle(shuffledAnswers);
  answerButtons.forEach((btn, index) => {
    btn.innerText = shuffledAnswers[index];
    btn.classList.remove('correct', 'incorrect');
    btn.disabled = false;
  });
  progressElem.style.width = `${((currentQuestionIndex + 1) / shuffledQuestions.length) * 100}%`;
}

function checkAnswer(selectedIndex) {
  const questionData = shuffledQuestions[currentQuestionIndex];
  const correctAnswerText = questionData.options[questionData.answer - 1];
  if (answerButtons[selectedIndex].innerText === correctAnswerText) {
    answerButtons[selectedIndex].classList.add('correct');
    correctGuess()
    incrementScore();
  } else {
    incorrectGuess(correctAnswerText)
    answerButtons[selectedIndex].classList.add('incorrect');
  }
  storeCookie("trivia", scoreToJson())
  answerButtons.forEach(btn => btn.disabled = true);
  setTimeout(nextQuestion, 1000);
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < shuffledQuestions.length) {
    loadQuestion();
  } else {
    endGame();
  }
}

function endGame() {
  stopOnTimer("Good Job, your score is " + getScore())
  clearScore()
}

function initCategories() {
  const categoriesElement = document.getElementById("categories");
  const categories = [...new Set(questions.map(item => item["category"]))]
  category = categories[0]
  categories
    .map(item => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'category';
      radio.value = item;
      if (category === item) {
        radio.checked = true;
      } 

      radio.addEventListener('change', function() {
        if (this.checked) {
          category = item
          startGame()
        }
      });
      label.appendChild(radio);
      label.appendChild(document.createTextNode(item));
      categoriesElement.appendChild(label);
      categoriesElement.appendChild(document.createElement('br'));
  });
}

let value = readCookie("trivia")
restoreScore(value)
initCategories();
startGame()
startButton.addEventListener('click', startGame);
answerButtons.forEach((btn, index) => {
  btn.addEventListener('click', () => checkAnswer(index));
});