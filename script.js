// Minimal Study Dashboard — script.js
// Handles: tasks, pomodoro, notes, theme, calendar, daily tasks, weekly schedule, simple animated chart

// ---------- THEME ----------
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  themeToggle.checked = true;
} else {
  document.documentElement.removeAttribute('data-theme');
  themeToggle.checked = false;
}
themeToggle.addEventListener('change', () => {
  if (themeToggle.checked) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  }
});

// ---------- TASKS (localStorage) ----------
let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
const taskList = document.getElementById('taskList');
const taskInput = document.getElementById('taskInput');
document.getElementById('addTaskBtn').addEventListener('click', addTask);
function addTask() {
  const v = taskInput.value.trim(); if (!v) return;
  tasks.push({ text: v, done: false, created: Date.now() });
  taskInput.value = ''; saveTasks(); renderTasks(); updateChartData();
}
function toggleTask(i) { tasks[i].done = !tasks[i].done; saveTasks(); renderTasks(); updateChartData(); }
function deleteTask(i) { tasks.splice(i, 1); saveTasks(); renderTasks(); updateChartData(); }
function saveTasks() { localStorage.setItem('tasks', JSON.stringify(tasks)); }
function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach((t, i) => {
    const d = document.createElement('div'); d.className = 'task' + (t.done ? ' done' : '');
    d.innerHTML = `<div>${t.text}</div><div>
      <button onclick="toggleTask(${i})">${t.done ? 'Undo' : 'Done'}</button>
      <button onclick="deleteTask(${i})" style="background:#b33;margin-left:6px">X</button>
    </div>`;
    taskList.appendChild(d);
  });
}
renderTasks();

// Expose for inline onclicks used in dynamically-created HTML
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;

// ---------- NOTES ----------
const notesBox = document.getElementById('notesBox'); notesBox.value = localStorage.getItem('notes') || '';
notesBox.addEventListener('input', () => { localStorage.setItem('notes', notesBox.value); });

// ---------- POMODORO ----------
let duration = 25 * 60;
let timeLeft = parseInt(localStorage.getItem('pomodoroTime') || duration);
let pomTimer = null;
const timeDisplay = document.getElementById('timeDisplay');
function formatTime(s) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, '0')}`; }
function updateTime() { timeDisplay.textContent = formatTime(timeLeft); }
updateTime();
document.getElementById('startBtn').addEventListener('click', () => {
  if (pomTimer) return;
  pomTimer = setInterval(() => {
    timeLeft--;
    updateTime();
    if (timeLeft <= 0) {
      clearInterval(pomTimer); pomTimer = null; alert('Pomodoro finished!');
      timeLeft = duration; savePom(); updateTime();
    } else { savePom(); }
  }, 1000);
});
document.getElementById('pauseBtn').addEventListener('click', () => { clearInterval(pomTimer); pomTimer = null; savePom(); });
document.getElementById('resetBtn').addEventListener('click', () => { clearInterval(pomTimer); pomTimer = null; timeLeft = duration; savePom(); updateTime(); });
function savePom() { localStorage.setItem('pomodoroTime', timeLeft); }

// ---------- CALENDAR (with daily tasks) ----------
const monthLabel = document.getElementById('monthLabel');
const calendarGrid = document.getElementById('calendarGrid');
let viewDate = new Date();
let dayData = JSON.parse(localStorage.getItem('dayData') || '{}'); // { "2025-11-19": [{text,done}] }
let selectedDate = null;

function dateKeyFromParts(y, m, d) {
  // returns YYYY-MM-DD (m and d zero-padded)
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function renderCalendar() {
  calendarGrid.innerHTML = '';
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed
  monthLabel.textContent = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=Sun
  const days = new Date(year, month + 1, 0).getDate();

  // Add blank cells for the first week (make week start Monday)
  const blanks = (startDay + 6) % 7; // convert Sun(0) to 6, Mon(1) to 0...
  for (let i = 0; i < blanks; i++) {
    const blank = document.createElement('div'); blank.className = 'cell'; calendarGrid.appendChild(blank);
  }

  for (let d = 1; d <= days; d++) {
    const cell = document.createElement('div'); cell.className = 'calendar-day';
    cell.textContent = d;
    const key = dateKeyFromParts(year, month + 1, d);
    cell.dataset.date = key;

    // mark days with tasks
    if (dayData[key] && dayData[key].length > 0) cell.classList.add('hasTasks');

    cell.addEventListener('click', () => openDay(key));
    calendarGrid.appendChild(cell);
  }
}
renderCalendar();
document.getElementById('prevMonth').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); });
document.getElementById('nextMonth').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); });

// ---------- DAY VIEW (click a date to open) ----------
const dayView = document.getElementById('dayView');
const dayTitle = document.getElementById('dayTitle');
const dayTaskInput = document.getElementById('dayTaskInput');
const dayTaskList = document.getElementById('dayTaskList');
document.getElementById('closeDayView').addEventListener('click', () => { dayView.style.display = 'none'; selectedDate = null; });

document.getElementById('addDayTaskBtn').addEventListener('click', addDayTask);

function openDay(dateKey) {
  selectedDate = dateKey;
  dayView.style.display = 'block';
  dayTitle.textContent = 'Tasks for ' + dateKey;
  renderDayTasks();
}

function addDayTask() {
  if (!selectedDate) return;
  const v = dayTaskInput.value.trim(); if (!v) return;
  if (!dayData[selectedDate]) dayData[selectedDate] = [];
  dayData[selectedDate].push({ text: v, done: false, created: Date.now() });
  dayTaskInput.value = '';
  saveDayData();
  renderDayTasks();
  renderCalendar(); // refresh highlights
  updateChartData();
}

function toggleDayTask(i) {
  if (!selectedDate || !dayData[selectedDate]) return;
  dayData[selectedDate][i].done = !dayData[selectedDate][i].done;
  saveDayData(); renderDayTasks(); updateChartData();
}

function deleteDayTask(i) {
  if (!selectedDate || !dayData[selectedDate]) return;
  dayData[selectedDate].splice(i, 1);
  if (dayData[selectedDate].length === 0) delete dayData[selectedDate];
  saveDayData(); renderDayTasks(); renderCalendar(); updateChartData();
}

function renderDayTasks() {
  dayTaskList.innerHTML = '';
  const items = (selectedDate && dayData[selectedDate]) ? dayData[selectedDate] : [];
  items.forEach((it, i) => {
    const row = document.createElement('div'); row.className = 'task' + (it.done ? ' done' : '');
    row.innerHTML = `<div>${it.text}</div><div>
      <button onclick="toggleDayTask(${i})">${it.done ? 'Undo' : 'Done'}</button>
      <button onclick="deleteDayTask(${i})" style="background:#b33;margin-left:6px">X</button>
    </div>`;
    dayTaskList.appendChild(row);
  });
}
function saveDayData() { localStorage.setItem('dayData', JSON.stringify(dayData)); }

// Expose day functions for inline onclicks
window.openDay = openDay;
window.addDayTask = addDayTask;
window.toggleDayTask = toggleDayTask;
window.deleteDayTask = deleteDayTask;

// ---------- WEEKLY SCHEDULE ----------
const weekGrid = document.getElementById('weekGrid');
const daysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
let weekData = JSON.parse(localStorage.getItem('weekData') || '{}');

function renderWeek() {
  weekGrid.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = document.createElement('div'); d.className = 'day';
    const title = document.createElement('div'); title.style.fontWeight = '600'; title.textContent = daysShort[i];
    const list = document.createElement('div'); list.style.marginTop = '8px';
    const key = 'day' + i;
    const items = weekData[key] || [];
    items.forEach((it, idx) => {
      const itDiv = document.createElement('div'); itDiv.style.fontSize = '14px'; itDiv.textContent = it;
      // add delete button per block
      const del = document.createElement('button'); del.textContent = '✕'; del.style.marginLeft = '8px'; del.style.background = '#b33';
      del.addEventListener('click', () => { weekData[key].splice(idx, 1); if (weekData[key].length === 0) delete weekData[key]; localStorage.setItem('weekData', JSON.stringify(weekData)); renderWeek(); updateChartData(); });
      const row = document.createElement('div'); row.style.display = 'flex'; row.style.alignItems = 'center';
      row.appendChild(itDiv); row.appendChild(del); list.appendChild(row);
    });

    const addBtn = document.createElement('button'); addBtn.textContent = '+ Add'; addBtn.style.marginTop = '8px';
    addBtn.addEventListener('click', () => {
      const val = prompt('Add study block for ' + daysShort[i]);
      if (val) {
        weekData[key] = weekData[key] || []; weekData[key].push(val);
        localStorage.setItem('weekData', JSON.stringify(weekData));
        renderWeek(); updateChartData();
      }
    });

    d.appendChild(title); d.appendChild(list); d.appendChild(addBtn); weekGrid.appendChild(d);
  }
}
renderWeek();

// ---------- SIMPLE ANIMATED CHART (canvas) ----------
const canvas = document.getElementById('studyChart'); const ctx = canvas.getContext('2d');
let chartData = [0,0,0,0,0,0,0];

function updateChartData() {
  // counts per weekday (Mon..Sun) from dayData and weekData and completed tasks
  const counts = [0,0,0,0,0,0,0];
  // from dayData (tasks per specific date)
  for (const key in dayData) {
    (dayData[key] || []).forEach(it => {
      if (it.done) {
        const d = new Date(key);
        if (!isNaN(d)) {
          const idx = (d.getDay() + 6) % 7; counts[idx]++;
        }
      }
    });
  }
  // from tasks (global tasks with created date)
  tasks.forEach(t => { if (t.done) { const d = new Date(t.created || Date.now()); const idx = (d.getDay() + 6) % 7; counts[idx]++; } });
  // from weekly schedule blocks
  for (let i=0;i<7;i++){ const key='day'+i; counts[i] += (weekData[key] || []).length; }
  chartData = counts; animateChart();
}
updateChartData();

function drawChart(progress) {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const w = canvas.width; const h = canvas.height; const padding = 40;
  const max = Math.max(1, ...chartData);
  const barW = (w - 2*padding) / chartData.length;
  // draw bars
  for (let i=0;i<chartData.length;i++){
    const x = padding + i*barW + 8;
    const barH = (chartData[i] / max) * (h - 2*padding) * progress;
    ctx.fillStyle = 'rgba(99,102,241,0.9)';
    ctx.fillRect(x, h - padding - barH, barW - 16, barH);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#6b7280';
    ctx.font = '12px Arial';
    ctx.fillText(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i], x, h - padding + 16);
  }
}

let animStart = null;
function animateChart(timestamp) {
  if (!timestamp) timestamp = performance.now();
  if (!animStart) animStart = timestamp;
  const t = (timestamp - animStart) / 600;
  const prog = Math.min(1, t);
  drawChart(prog);
  if (prog < 1) requestAnimationFrame(animateChart);
  else animStart = null;
}

// trigger animation in next frame
requestAnimationFrame(animateChart);

// ---------- make UI snappy on mobile ----------
(function(){ document.querySelectorAll('button').forEach(b => b.style.fontSize = '14px'); })();

// ensure data consistency when page loads or changes
window.addEventListener('load', () => { renderCalendar(); renderWeek(); renderTasks(); updateChartData(); });
