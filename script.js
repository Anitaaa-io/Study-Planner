// --- Authentication Check ---
const currentUser = localStorage.getItem('studyPlannerUser');
const isDashboard = window.location.pathname.includes('dashboard.html');

if (!currentUser && isDashboard) {
    window.location.href = 'index.html';
}

if (currentUser && document.getElementById('userNameDisplay')) {
    document.getElementById('userNameDisplay').textContent = currentUser;
}

// --- Theme Management ---
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('studyPlannerTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('studyPlannerTheme', newTheme);
        updateThemeToggleIcon(newTheme);
    });
}

function updateThemeToggleIcon(theme) {
    if (!themeToggle) return;
    const icon = themeToggle.querySelector('i');
    const text = themeToggle.querySelector('span');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        text.textContent = 'Light Mode';
    } else {
        icon.className = 'fas fa-moon';
        text.textContent = 'Dark Mode';
    }
}

// --- Logout ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('studyPlannerUser');
        window.location.href = 'index.html';
    });
}

// --- Motivational Quotes ---
const quotes = [
    "The secret of getting ahead is getting started.",
    "It always seems impossible until it's done.",
    "Don't watch the clock; do what it does. Keep going.",
    "Education is the most powerful weapon which you can use to change the world.",
    "Success is the sum of small efforts, repeated day in and day out.",
    "Believe you can and you're halfway there.",
    "Your future is created by what you do today, not tomorrow."
];

const quoteText = document.getElementById('quoteText');
if (quoteText) {
    quoteText.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

// --- Task Management ---
let tasks = JSON.parse(localStorage.getItem(`tasks_${currentUser}`)) || [];
let streak = JSON.parse(localStorage.getItem(`streak_${currentUser}`)) || { count: 0, lastDate: null };

function updateStreak() {
    const todayLocal = new Date();
    const tzoffset = todayLocal.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
    
    // Check if task completed today
    const completedToday = tasks.some(t => t.completed && t.date === localISOTime);
    
    if (completedToday) {
        if (streak.lastDate !== localISOTime) {
            // Did they complete something yesterday?
            const yesterdayLocal = new Date(todayLocal);
            yesterdayLocal.setDate(yesterdayLocal.getDate() - 1);
            const yesterdayISOTime = (new Date(yesterdayLocal.getTime() - tzoffset)).toISOString().split('T')[0];
            
            if (streak.lastDate === yesterdayISOTime) {
                streak.count++;
            } else {
                streak.count = 1;
            }
            streak.lastDate = localISOTime;
            localStorage.setItem(`streak_${currentUser}`, JSON.stringify(streak));
        }
    }
    
    const streakDisplay = document.getElementById('streakCount');
    if (streakDisplay) {
        streakDisplay.textContent = `${streak.count} Day${streak.count !== 1 ? 's' : ''}`;
    }
}

function saveTasks() {
    localStorage.setItem(`tasks_${currentUser}`, JSON.stringify(tasks));
    renderTasks();
    updateProgress();
    updateStreak();
}

const taskFormSection = document.getElementById('taskFormContainer');
const addTaskBtn = document.getElementById('addTaskBtn');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');
const taskForm = document.getElementById('taskForm');

if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
        taskForm.reset();
        document.getElementById('taskId').value = '';
        taskFormSection.classList.remove('hidden');
    });
}

if (cancelTaskBtn) {
    cancelTaskBtn.addEventListener('click', () => {
        taskFormSection.classList.add('hidden');
    });
}

if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('taskId').value;
        const subject = document.getElementById('taskSubject').value;
        const date = document.getElementById('taskDate').value;
        const time = document.getElementById('taskTime').value;

        if (id) {
            const taskIndex = tasks.findIndex(t => t.id === id);
            if (taskIndex > -1) {
                tasks[taskIndex].subject = subject;
                tasks[taskIndex].date = date;
                tasks[taskIndex].time = time;
                tasks[taskIndex].notified = false; // Reset notification state if edited
            }
        } else {
            tasks.push({
                id: Date.now().toString(),
                subject,
                date,
                time,
                completed: false,
                notified: false
            });
        }

        saveTasks();
        taskFormSection.classList.add('hidden');
        taskForm.reset();
    });
}

function renderTasks() {
    const todayList = document.getElementById('todayTaskList');
    const upcomingList = document.getElementById('upcomingTaskList');
    
    if (!todayList || !upcomingList) return;

    todayList.innerHTML = '';
    upcomingList.innerHTML = '';

    const sortedTasks = [...tasks].sort((a, b) => {
        return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
    });

    const todayLocal = new Date();
    const tzoffset = todayLocal.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];

    sortedTasks.forEach(task => {
        const isToday = task.date === localISOTime;
        
        const taskEl = document.createElement('li');
        taskEl.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskEl.innerHTML = `
            <div class="task-checkbox" onclick="toggleTask('${task.id}')">
                <i class="fas fa-check"></i>
            </div>
            <div class="task-info">
                <h5>${task.subject}</h5>
                <span class="task-time-badge"><i class="far fa-clock"></i> ${formatTime(task.time)} ${!isToday ? `| ${formatDate(task.date)}` : ''}</span>
            </div>
            <div class="task-actions">
                <button class="edit-btn" onclick="editTask('${task.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="delete-btn" onclick="deleteTask('${task.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        `;

        // If date is before today and not completed, maybe show in today? 
        // For simplicity, strictly today vs future. We'll show overdue in today as well.
        if (task.date <= localISOTime) {
            todayList.appendChild(taskEl);
        } else {
            upcomingList.appendChild(taskEl);
        }
    });

    if (todayList.children.length === 0) {
        todayList.innerHTML = '<p style="color: var(--text-muted); padding: 10px;">No tasks. Enjoy your day! 🎉</p>';
    }
    if (upcomingList.children.length === 0) {
        upcomingList.innerHTML = '<p style="color: var(--text-muted); padding: 10px;">No upcoming tasks.</p>';
    }
}

function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
}

function formatDate(dateStr) {
    const options = { month: 'short', day: 'numeric' };
    // Fixing timezone issue during formatting
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString('en-US', options);
}

window.toggleTask = function(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
    }
};

window.deleteTask = function(id) {
    if(confirm("Are you sure you want to delete this task?")) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
    }
};

window.editTask = function(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskSubject').value = task.subject;
        document.getElementById('taskDate').value = task.date;
        document.getElementById('taskTime').value = task.time;
        taskFormSection.classList.remove('hidden');
        taskFormSection.scrollIntoView({ behavior: 'smooth' });
    }
};

function updateProgress() {
    const progressCircle = document.getElementById('progressCircle');
    const progressText = document.getElementById('progressText');
    const progressSubtitle = document.getElementById('progressSubtitle');
    
    if (!progressCircle) return;

    const todayLocal = new Date();
    const tzoffset = todayLocal.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];

    // Count today AND overdue tasks
    const activeTasks = tasks.filter(t => t.date <= localISOTime);
    const totalActive = activeTasks.length;
    const completedActive = activeTasks.filter(t => t.completed).length;

    let percentage = 0;
    if (totalActive > 0) {
        percentage = Math.round((completedActive / totalActive) * 100);
    }

    progressText.textContent = `${percentage}%`;
    progressSubtitle.textContent = `${completedActive}/${totalActive} completed`;
    
    progressCircle.style.background = `conic-gradient(var(--primary-color) ${percentage}%, rgba(99, 102, 241, 0.1) ${percentage}%)`;
}


// --- Pomodoro Timer ---
let timerInterval;
let timeLeft = 25 * 60;
let isTimerRunning = false;
let currentMode = 'work';

const timerDisplay = document.getElementById('timerDisplay');
const startTimerBtn = document.getElementById('startTimer');
const pauseTimerBtn = document.getElementById('pauseTimer');
const resetTimerBtn = document.getElementById('resetTimer');
const modeBtns = document.querySelectorAll('.mode-btn');

function updateTimerDisplay() {
    if (!timerDisplay) return;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

if (startTimerBtn) {
    startTimerBtn.addEventListener('click', () => {
        if (!isTimerRunning) {
            isTimerRunning = true;
            startTimerBtn.disabled = true;
            pauseTimerBtn.disabled = false;
            
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    isTimerRunning = false;
                    startTimerBtn.disabled = false;
                    pauseTimerBtn.disabled = true;
                    showNotification("Timer Complete!", `Your ${currentMode} session has ended.`);
                    
                    const nextModeBtn = document.querySelector(`.mode-btn[data-mode="${currentMode === 'work' ? 'break' : 'work'}"]`);
                    if(nextModeBtn) nextModeBtn.click();
                }
            }, 1000);
        }
    });

    pauseTimerBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
        startTimerBtn.disabled = false;
        pauseTimerBtn.disabled = true;
    });

    resetTimerBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
        startTimerBtn.disabled = false;
        pauseTimerBtn.disabled = true;
        timeLeft = currentMode === 'work' ? 25 * 60 : 5 * 60;
        updateTimerDisplay();
    });

    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentMode = e.target.dataset.mode;
            timeLeft = currentMode === 'work' ? 25 * 60 : 5 * 60;
            
            clearInterval(timerInterval);
            isTimerRunning = false;
            startTimerBtn.disabled = false;
            pauseTimerBtn.disabled = true;
            updateTimerDisplay();
        });
    });
}


// --- Smart Reminders (Notifications) ---
const notifBanner = document.getElementById('notificationBanner');
const enableNotifsBtn = document.getElementById('enableNotifications');
const dismissNotifsBtn = document.getElementById('dismissNotifications');

if (notifBanner && "Notification" in window) {
    if (Notification.permission === "default") {
        setTimeout(() => {
            notifBanner.classList.remove('hidden');
        }, 2000);
    }
}

if (enableNotifsBtn) {
    enableNotifsBtn.addEventListener('click', () => {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                notifBanner.classList.add('hidden');
                showNotification("Enabled!", "You will now receive study reminders.");
            }
        });
    });
}

if (dismissNotifsBtn) {
    dismissNotifsBtn.addEventListener('click', () => {
        notifBanner.classList.add('hidden');
    });
}

function showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "https://cdn-icons-png.flaticon.com/512/3750/3750040.png" });
    }
}

setInterval(() => {
    if (!currentUser || typeof tasks === 'undefined') return;
    
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5);
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];

    let changed = false;

    tasks.forEach(task => {
        if (!task.completed && !task.notified && task.date === localISOTime && task.time === timeStr) {
            showNotification("Study Reminder 📚", `It's time to study: ${task.subject}`);
            task.notified = true;
            changed = true;
        }
    });

    if (changed) {
        localStorage.setItem(`tasks_${currentUser}`, JSON.stringify(tasks));
    }
}, 10000); // Check every 10s

// Initial renders mapping
if (isDashboard) {
    renderTasks();
    updateProgress();
    updateStreak();
    updateTimerDisplay();
}
