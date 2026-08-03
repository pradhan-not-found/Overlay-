import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="pill-container" id="pill">
    <div class="content idle-content">
      <span id="idle-clock">12:00</span>
      <span>100%</span>
    </div>
    <div class="content expanded-content">
      <h3 style="margin: 0 0 15px 0; font-size: 16px;">Overlay Controls</h3>
      <div style="display: flex; gap: 10px;">
        <button id="btn-lock-in" class="accent">Lock In</button>
        <button id="btn-media">Media</button>
      </div>
    </div>
    <div class="content lock-in-content">
      <span class="timer" id="timer-display">25:00</span>
      <button id="btn-end-focus">Stop</button>
    </div>
  </div>
`

const pill = document.getElementById('pill')!;
const btnLockIn = document.getElementById('btn-lock-in')!;
const btnEndFocus = document.getElementById('btn-end-focus')!;
const timerDisplay = document.getElementById('timer-display')!;
const idleClock = document.getElementById('idle-clock')!;

let state: 'idle' | 'expanded' | 'lock-in' = 'idle';
let timerInterval: number | undefined;
let timeLeft = 25 * 60; // 25 mins

pill.addEventListener('click', (e) => {
  if (state === 'idle') {
    state = 'expanded';
    pill.className = 'pill-container expanded';
  } else if (state === 'expanded' && (e.target as HTMLElement).tagName !== 'BUTTON') {
    state = 'idle';
    pill.className = 'pill-container';
  }
});

btnLockIn.addEventListener('click', (e) => {
  e.stopPropagation();
  state = 'lock-in';
  pill.className = 'pill-container lock-in';
  startTimer();
});

btnEndFocus.addEventListener('click', (e) => {
  e.stopPropagation();
  state = 'expanded';
  pill.className = 'pill-container expanded';
  stopTimer();
});

function startTimer() {
  timeLeft = 25 * 60;
  updateTimerDisplay();
  timerInterval = window.setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      stopTimer();
      state = 'expanded';
      pill.className = 'pill-container expanded';
    }
  }, 1000) as unknown as number;
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = undefined;
  }
}

function updateTimerDisplay() {
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${m}:${s}`;
}

// Basic clock updater for idle state
setInterval(() => {
  if (state === 'idle') {
    const d = new Date();
    idleClock.textContent = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  }
}, 1000);

// Initialize clock immediately
const d = new Date();
idleClock.textContent = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
