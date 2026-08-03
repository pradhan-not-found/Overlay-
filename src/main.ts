import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="pill-container" id="pill">
    
    <!-- Idle State -->
    <div class="content idle-content active" id="content-idle">
      <span class="idle-clock" id="idle-clock">12:00</span>
      <span class="idle-battery">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect><line x1="22" y1="11" x2="22" y2="13"></line></svg>
        100%
      </span>
    </div>

    <!-- Expanded State -->
    <div class="content expanded-content" id="content-expanded">
      <div class="expanded-header">
        <h3>Overlay</h3>
        <span class="idle-battery">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect><line x1="22" y1="11" x2="22" y2="13"></line></svg>
          100%
        </span>
      </div>
      <div class="expanded-actions">
        <button id="btn-lock-in" class="accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Lock In
        </button>
        <button id="btn-media">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Media
        </button>
      </div>
    </div>

    <!-- Lock In (Focus) State -->
    <div class="content lock-in-content" id="content-lock-in">
      <div class="timer-group">
        <div class="timer-dot"></div>
        <span class="timer" id="timer-display">25:00</span>
      </div>
      <button class="btn-stop" id="btn-end-focus">Stop</button>
    </div>

  </div>
`;

const pill = document.getElementById('pill')!;
const btnLockIn = document.getElementById('btn-lock-in')!;
const btnEndFocus = document.getElementById('btn-end-focus')!;
const timerDisplay = document.getElementById('timer-display')!;
const idleClock = document.getElementById('idle-clock')!;

const contentIdle = document.getElementById('content-idle')!;
const contentExpanded = document.getElementById('content-expanded')!;
const contentLockIn = document.getElementById('content-lock-in')!;

let state: 'idle' | 'expanded' | 'lock-in' = 'idle';
let timerInterval: number | undefined;
let timeLeft = 25 * 60; // 25 mins

function switchState(newState: 'idle' | 'expanded' | 'lock-in') {
  state = newState;
  
  // Remove active from all
  contentIdle.classList.remove('active');
  contentExpanded.classList.remove('active');
  contentLockIn.classList.remove('active');

  if (state === 'idle') {
    pill.className = 'pill-container';
    contentIdle.classList.add('active');
  } else if (state === 'expanded') {
    pill.className = 'pill-container expanded';
    contentExpanded.classList.add('active');
  } else if (state === 'lock-in') {
    pill.className = 'pill-container lock-in';
    contentLockIn.classList.add('active');
  }
}

pill.addEventListener('click', (e) => {
  if (state === 'idle') {
    switchState('expanded');
  } else if (state === 'expanded' && (e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).tagName !== 'path' && (e.target as HTMLElement).tagName !== 'svg') {
    switchState('idle');
  }
});

btnLockIn.addEventListener('click', (e) => {
  e.stopPropagation();
  startTimer();
  switchState('lock-in');
});

btnEndFocus.addEventListener('click', (e) => {
  e.stopPropagation();
  stopTimer();
  switchState('expanded');
});

function startTimer() {
  timeLeft = 25 * 60;
  updateTimerDisplay();
  timerInterval = window.setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      stopTimer();
      switchState('expanded');
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

setInterval(() => {
  const d = new Date();
  idleClock.textContent = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}, 1000);

// Initialize clock immediately
const d = new Date();
idleClock.textContent = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
