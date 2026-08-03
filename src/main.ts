import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="pill-container" id="pill">
    
    <!-- Idle State -->
    <div class="content idle-content active" id="content-idle">
      <span class="idle-time">
        <span id="idle-clock">12:00</span>
        <div class="battery-indicator" id="battery-indicator" style="display: none;">
          <div class="battery-icon">
            <div class="battery-level" id="battery-level"></div>
          </div>
        </div>
      </span>
      
      <div class="idle-quick-actions" id="idle-quick-actions">
        <!-- Icons mirrored here -->
      </div>

      <div class="idle-music-indicator" id="idle-music-indicator" style="display: none;">
        <div class="music-bars">
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
        </div>
      </div>
    </div>

    <!-- Expanded State (Dashboard) -->
    <div class="content expanded-content" id="content-expanded">
      
      <!-- Media Player Widget -->
      <div class="widget-section media-player">
        <div class="album-art"></div>
        <div class="track-info">
          <div class="track-title">Starboy</div>
          <div class="track-artist">
            <img class="real-logo" src="https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg" alt="Spotify" />
            The Weeknd, Daft Punk
          </div>
        </div>
        <div class="playback-controls">
          <button class="icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
        </div>
      </div>

      <!-- Focus & To-Do Widget -->
      <div class="widget-section">
        <div class="focus-header">
          <span class="focus-title">Focus Session</span>
          <div class="focus-history" title="Sessions completed today">
            🔥 <span id="focus-history-count">0</span>
          </div>
        </div>
        
        <div class="timer-display" id="timer-display">25:00</div>
        
        <div class="focus-controls">
          <button class="btn-primary" id="btn-toggle-timer">Start Focus</button>
          <button class="btn-secondary" id="btn-reset-timer">Reset</button>
        </div>

        <div class="todo-list" id="todo-list">
          <div class="todo-item">
            <input type="checkbox" class="todo-checkbox" />
            <span class="todo-text">Write product spec</span>
          </div>
          <div class="todo-item">
            <input type="checkbox" class="todo-checkbox" />
            <span class="todo-text">Review PR #42</span>
          </div>
          <div class="todo-input-wrap">
            <input type="text" class="todo-input" id="todo-input" placeholder="+ Add a task and press Enter..." />
          </div>
        </div>
      </div>

      <!-- Quick Start Widget -->
      <div class="widget-section">
        <div class="quick-start-header">
          <span class="quick-start-title">Quick Actions</span>
        </div>
        <div class="quick-start-grid" id="quick-start-grid">
          <button class="quick-btn add-btn" id="btn-add-shortcut" title="Add Shortcut">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <div class="todo-input-wrap" id="quick-start-input-wrap" style="display: none; margin-top: 10px;">
          <input type="text" class="todo-input" id="shortcut-input" placeholder="Type URL (e.g. github.com) and press Enter..." />
        </div>
      </div>

    </div>
  </div>
`;

const pill = document.getElementById('pill')!;
const contentIdle = document.getElementById('content-idle')!;
const contentExpanded = document.getElementById('content-expanded')!;
const idleClock = document.getElementById('idle-clock')!;

const timerDisplay = document.getElementById('timer-display')!;
const btnToggleTimer = document.getElementById('btn-toggle-timer')!;
const btnResetTimer = document.getElementById('btn-reset-timer')!;

const todoList = document.getElementById('todo-list')!;
const todoInput = document.getElementById('todo-input') as HTMLInputElement;

let state: 'idle' | 'expanded' = 'idle';

// Timer Logic
let timerInterval: number | undefined;
let timeLeft = 25 * 60; 
let isTimerRunning = false;

// Load History
const historyCountEl = document.getElementById('focus-history-count')!;
let sessionsCompleted = parseInt(localStorage.getItem('overlay_focus_history') || '0', 10);
historyCountEl.textContent = sessionsCompleted.toString();

function recordSession() {
  sessionsCompleted++;
  localStorage.setItem('overlay_focus_history', sessionsCompleted.toString());
  historyCountEl.textContent = sessionsCompleted.toString();
}

function updateTimerDisplay() {
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${m}:${s}`;
}

btnToggleTimer.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    btnToggleTimer.textContent = 'Resume';
  } else {
    isTimerRunning = true;
    btnToggleTimer.textContent = 'Pause';
    timerInterval = window.setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        timeLeft = 0;
        btnToggleTimer.textContent = 'Done';
        recordSession();
        
        // Native notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Focus Session Complete!', { body: 'Great job. Take a short break.' });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') new Notification('Focus Session Complete!');
          });
        }
      }
      updateTimerDisplay();
    }, 1000) as unknown as number;
  }
});

btnResetTimer.addEventListener('click', (e) => {
  e.stopPropagation();
  clearInterval(timerInterval);
  isTimerRunning = false;
  timeLeft = 25 * 60;
  btnToggleTimer.textContent = 'Start Focus';
  updateTimerDisplay();
});

// To-Do Logic
todoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && todoInput.value.trim() !== '') {
    e.preventDefault();
    
    const item = document.createElement('div');
    item.className = 'todo-item';
    item.innerHTML = `
      <input type="checkbox" class="todo-checkbox" />
      <span class="todo-text">${todoInput.value.trim()}</span>
    `;
    
    // Insert before the input wrapper
    todoList.insertBefore(item, todoInput.parentElement);
    todoInput.value = '';
    
    // Add event listener to new checkbox
    const cb = item.querySelector('.todo-checkbox') as HTMLInputElement;
    const text = item.querySelector('.todo-text')!;
    cb.addEventListener('change', () => {
      if (cb.checked) text.classList.add('done');
      else text.classList.remove('done');
    });
  }
});

// Bind existing checkboxes
document.querySelectorAll('.todo-checkbox').forEach(cb => {
  cb.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const text = target.nextElementSibling!;
    if (target.checked) text.classList.add('done');
    else text.classList.remove('done');
  });
});

// IPC and Window Resizing
let ipcRenderer: any = null;
try {
  if ((window as any).require) {
    ipcRenderer = (window as any).require('electron').ipcRenderer;
  }
} catch (e) {
  console.log("Not running in Electron");
}

function resizeOsWindow(width: number, height: number) {
  if (ipcRenderer) {
    ipcRenderer.send('resize-window', { width: width + 80, height: height + 80 });
  }
}

function switchState(newState: 'idle' | 'expanded') {
  state = newState;
  contentIdle.classList.remove('active');
  contentExpanded.classList.remove('active');

  if (state === 'idle') {
    pill.className = 'pill-container';
    contentIdle.classList.add('active');
    // Wait for the 600ms CSS spring animation to finish before shrinking the OS window!
    setTimeout(() => {
      if (state === 'idle') { // Make sure user didn't re-expand during animation
        resizeOsWindow(260, 44); 
      }
    }, 600);
  } else if (state === 'expanded') {
    // Expand OS window instantly so CSS animation doesn't clip
    resizeOsWindow(360, 600);
    // Need a tiny delay for OS window to actually resize before starting CSS animation
    requestAnimationFrame(() => {
      pill.className = 'pill-container expanded';
      contentExpanded.classList.add('active');
    });
  }
}

resizeOsWindow(260, 44);

// Clock
setInterval(() => {
  const d = new Date();
  idleClock.textContent = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}, 1000);
{
  const d = new Date();
  idleClock.textContent = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

// Battery Management Integration
const batteryIndicator = document.getElementById('battery-indicator')!;
const batteryLevel = document.getElementById('battery-level')!;
const batteryText = document.getElementById('battery-text')!;

if ('getBattery' in navigator) {
  (navigator as any).getBattery().then((battery: any) => {
    function updateBatteryStatus() {
      batteryIndicator.style.display = 'flex';
      const level = Math.round(battery.level * 100);
      batteryText.textContent = `${level}%`;
      batteryLevel.style.width = `${level}%`;
      
      batteryLevel.className = 'battery-level';
      if (battery.charging) {
        batteryLevel.classList.add('charging');
      } else if (level <= 20) {
        batteryLevel.classList.add('low');
      }
    }
    
    updateBatteryStatus();
    battery.addEventListener('levelchange', updateBatteryStatus);
    battery.addEventListener('chargingchange', updateBatteryStatus);
  });
}

// Quick Start Shortcuts Integration
const quickGrid = document.getElementById('quick-start-grid')!;
const btnAddShortcut = document.getElementById('btn-add-shortcut')!;
const shortcutInputWrap = document.getElementById('quick-start-input-wrap')!;
const shortcutInput = document.getElementById('shortcut-input') as HTMLInputElement;

let shortcuts: { url: string }[] = JSON.parse(localStorage.getItem('overlay_shortcuts') || '[]');
if (shortcuts.length === 0) {
  shortcuts = [
    { url: 'https://chatgpt.com' },
    { url: 'https://claude.ai' }
  ];
  localStorage.setItem('overlay_shortcuts', JSON.stringify(shortcuts));
}

function renderShortcuts() {
  document.querySelectorAll('.shortcut-btn').forEach(el => el.remove());
  document.querySelectorAll('.idle-shortcut-btn').forEach(el => el.remove());
  
  const idleContainer = document.getElementById('idle-quick-actions')!;
  
  shortcuts.forEach(s => {
    try {
      const urlObj = new URL(s.url.startsWith('http') ? s.url : `https://${s.url}`);
      // Use Clearbit for ultra-high-res transparent logos, fallback to Google Favicon if it fails
      const clearbitUrl = `https://logo.clearbit.com/${urlObj.hostname}`;
      const fallbackUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
      
      let innerHTML = `<img src="${clearbitUrl}" onerror="this.onerror=null; this.src='${fallbackUrl}';" style="width:24px; height:24px; border-radius:4px; object-fit: contain;" />`;
      let idleInnerHTML = `<img src="${clearbitUrl}" onerror="this.onerror=null; this.src='${fallbackUrl}';" style="width:18px; height:18px; border-radius:4px; object-fit: contain;" />`;

      // Flawless Dark Mode SVGs for specific brands
      if (s.url.includes('github.com')) {
        const svg = `<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z"/></svg>`;
        innerHTML = `<div style="width:24px; height:24px; display:flex;">${svg}</div>`;
        idleInnerHTML = `<div style="width:18px; height:18px; display:flex;">${svg}</div>`;
      } else if (s.url.includes('chatgpt.com') || s.url.includes('openai.com')) {
        const svg = `<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M22.28 11.2a5.45 5.45 0 0 0-.75-3.52c-.1-.17-.23-.33-.36-.48a5.55 5.55 0 0 0-4.48-1.92l-.12.02A5.3 5.3 0 0 0 12 2.25a5.27 5.27 0 0 0-4.66 2.87 5.5 5.5 0 0 0-4.8 2.3 5.45 5.45 0 0 0 .61 6.57c-.12.44-.15.9-.1 1.35.08.76.32 1.49.71 2.15a5.55 5.55 0 0 0 4.45 2.1l.15-.02a5.3 5.3 0 0 0 4.54 2.94 5.27 5.27 0 0 0 4.67-2.85 5.5 5.5 0 0 0 4.79-2.3 5.45 5.45 0 0 0-.1-6.73a5.5 5.5 0 0 0-.25-1.34c0-.02 0-.04.01-.06Zm-11 8.94c-1.74 0-3.32-.97-4.13-2.52l.2-.12 3.65-2.11c.21-.13.34-.36.34-.6V9.82l2.3 1.33v4.61c.02 2.45-1.92 4.46-4.36 4.48ZM3.53 15a4.34 4.34 0 0 1 1.25-3.08l.18.14 2.76 2.77V9.75l-2.3 1.33c-.93.53-1.5 1.54-1.5 2.62v2.79c-.06.26-.2.49-.39.67A4.29 4.29 0 0 1 3.53 15Zm1.25-8.08A4.34 4.34 0 0 1 7.86 4.96c.72-.42 1.53-.63 2.36-.63l-.15.2 1.4 3.49-4.14 2.39-2.3-1.33A3.01 3.01 0 0 1 3.53 6.9c.2-.55.51-1.05.91-1.46.1-.1.21-.2.34-.3ZM16.36 7.6c1.74 0 3.32.97 4.13 2.52l-.2.12-3.65 2.11c-.21.13-.34.36-.34.6v4.97l-2.3-1.33V12c-.02-2.45 1.92-4.46 4.36-4.48ZM20.47 9c.14 1.05-.13 2.12-.76 2.98l-.18-.14-2.76-2.77v5.08l2.3-1.33c.93-.53 1.5-1.54 1.5-2.62V7.41c.06-.26.2-.49.39-.67a4.29 4.29 0 0 1-.5 6.26ZM19.22 4.96c-.72.42-1.53.63-2.36.63l.15-.2-1.4-3.49 4.14-2.39 2.3 1.33a3.01 3.01 0 0 1 1.5 2.18c-.2.55-.51 1.05-.91 1.46-.1.1-.21.2-.34.3ZM12 5.92c1.7 0 3.2.98 3.96 2.53v.15l-3.34-1.41-3.34 1.41v-.15c.76-1.55 2.26-2.53 3.96-2.53v-.02l-.12.02ZM7.72 9.53 12 7.07l4.28 2.46v4.94L12 16.93l-4.28-2.46V9.53Z"/></svg>`;
        innerHTML = `<div style="width:24px; height:24px; display:flex;">${svg}</div>`;
        idleInnerHTML = `<div style="width:18px; height:18px; display:flex;">${svg}</div>`;
      }
      
      // 1. Render in Expanded Grid
      const btn = document.createElement('button');
      btn.className = 'quick-btn shortcut-btn';
      btn.title = s.url;
      btn.innerHTML = innerHTML;
      
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (ipcRenderer) ipcRenderer.send('open-external', urlObj.href);
        else window.open(urlObj.href, '_blank');
      });
      quickGrid.insertBefore(btn, btnAddShortcut);

      // 2. Render in Idle Tab
      const idleBtn = document.createElement('button');
      idleBtn.className = 'idle-quick-btn idle-shortcut-btn';
      idleBtn.title = s.url;
      idleBtn.innerHTML = idleInnerHTML;
      
      idleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (ipcRenderer) ipcRenderer.send('open-external', urlObj.href);
        else window.open(urlObj.href, '_blank');
      });
      idleContainer.appendChild(idleBtn);
      
    } catch(e) {}
  });
}

btnAddShortcut.addEventListener('click', (e) => {
  e.stopPropagation();
  shortcutInputWrap.style.display = shortcutInputWrap.style.display === 'none' ? 'block' : 'none';
  if (shortcutInputWrap.style.display === 'block') {
    shortcutInput.focus();
  }
});

shortcutInput.addEventListener('keydown', (e) => {
  e.stopPropagation(); // Don't trigger drag or close window!
  if (e.key === 'Enter' && shortcutInput.value.trim() !== '') {
    e.preventDefault();
    let url = shortcutInput.value.trim();
    if (!url.startsWith('http')) url = `https://${url}`;
    
    shortcuts.push({ url });
    localStorage.setItem('overlay_shortcuts', JSON.stringify(shortcuts));
    renderShortcuts();
    
    shortcutInput.value = '';
    shortcutInputWrap.style.display = 'none';
  }
});

renderShortcuts();

// Drag Logic
let isMouseDown = false;
let isDragging = false;
let startX = 0;
let startY = 0;
let dragTriggered = false;

pill.addEventListener('mousedown', (e) => {
  const target = e.target as HTMLElement;
  // Allow dragging from widget background, just not from inputs or buttons
  if (target.closest('button') || target.tagName === 'INPUT' || target.closest('.todo-item')) {
    return;
  }
  isMouseDown = true;
  isDragging = false;
  dragTriggered = false;
  startX = e.screenX;
  startY = e.screenY;
});

window.addEventListener('mousemove', (e) => {
  if (!isMouseDown) return;
  
  const deltaX = e.screenX - startX;
  const deltaY = e.screenY - startY;
  
  if (!dragTriggered && (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15)) {
    isDragging = true;
    dragTriggered = true;
    if (ipcRenderer) {
      ipcRenderer.send('start-drag');
    }
  }
});

window.addEventListener('mouseup', () => {
  isMouseDown = false;
  if (dragTriggered && ipcRenderer) {
    ipcRenderer.send('stop-drag');
  }
});

pill.addEventListener('click', (e) => {
  if (isDragging) return;
  
  const target = e.target as HTMLElement;
  // ONLY ignore clicks on actual interactive elements so they can close it!
  if (target.closest('button') || target.tagName === 'INPUT' || target.closest('.todo-checkbox') || target.closest('.todo-item')) {
    return; 
  }

  if (state === 'idle') {
    switchState('expanded');
  } else if (state === 'expanded') {
    switchState('idle');
  }
});
