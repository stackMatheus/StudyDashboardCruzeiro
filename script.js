// --- VARIÁVEIS DO DOM (KANBAN E PROG) ---
const addTaskBtn = document.getElementById('add-task-btn');
const newTaskInput = document.getElementById('new-task-input');
const newTaskPriority = document.getElementById('new-task-priority');

const todoList = document.querySelector('[data-status="todo"]');
const inProgressList = document.querySelector('[data-status="in-progress"]');
const doneList = document.querySelector('[data-status="done"]');

const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');

// --- VARIÁVEIS DO POMODORO ---
const timerDisplay = document.getElementById('timer-display');
const timerStatus = document.getElementById('timer-status');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const cyclesCountDisplay = document.getElementById('cycles-count');

// --- VARIÁVEIS DE FLASHCARD ---
const flashcardInput = document.getElementById('flashcard-input');
const addFlashcardBtn = document.getElementById('add-flashcard-btn');
const flashcardDisplay = document.getElementById('flashcard-display');
const reviewFlashcardBtn = document.getElementById('review-flashcard-btn');

// --- VARIÁVEIS DE ESTADO ---
let tasks = []; // Array para tarefas Kanban
let flashcards = []; // Array para Flashcards
let currentFlashcardIndex = -1; // Rastreia o card atual
let showingFront = true; // Rastreia o lado do card

const STUDY_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;
let currentTime = STUDY_TIME;
let isRunning = false;
let isStudyMode = true;
let pomodoroInterval;
let cyclesCompleted = 0;


// =========================================================
//                   1. FUNÇÕES KANBAN E PROGRESSO
// =========================================================

function loadTasks() {
    const savedTasks = localStorage.getItem('studyFlowTasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
    renderTasks();
    updateProgress();
}

function saveTasks() {
    localStorage.setItem('studyFlowTasks', JSON.stringify(tasks));
    updateProgress();
}

function createTaskElement(task) {
    const card = document.createElement('div');
    card.className = `task-card ${task.priority}-priority`;
    card.setAttribute('draggable', true);
    card.id = `task-${task.id}`;
    
    card.setAttribute('onclick', `changeTaskStatus('${task.id}')`); 
    
    card.innerHTML = `
        <span>${task.text}</span>
        <button onclick="event.stopPropagation(); deleteTask('${task.id}')">X</button>
        <p class="priority-tag">Prioridade: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</p>
    `;
    card.addEventListener('dragstart', drag);
    return card;
}

function renderTasks() {
    todoList.innerHTML = '';
    inProgressList.innerHTML = '';
    doneList.innerHTML = '';

    tasks.forEach(task => {
        const element = createTaskElement(task);
        if (task.status === 'todo') {
            todoList.appendChild(element);
        } else if (task.status === 'in-progress') {
            inProgressList.appendChild(element);
        } else if (task.status === 'done') {
            doneList.appendChild(element);
        }
    });
}

function addTask() {
    const text = newTaskInput.value.trim();
    const priority = newTaskPriority.value;

    if (text === '') {
        console.error('O nome da tarefa não pode ser vazio!');
        return;
    }

    const newTask = {
        id: Date.now().toString(),
        text: text,
        priority: priority,
        status: 'todo'
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks();
    newTaskInput.value = '';
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
}

function changeTaskStatus(id) {
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) return;

    const currentStatus = tasks[taskIndex].status;
    let newStatus;

    if (currentStatus === 'todo') {
        newStatus = 'in-progress';
    } else if (currentStatus === 'in-progress') {
        newStatus = 'done';
    } else if (currentStatus === 'done') {
        newStatus = 'todo'; 
    }

    tasks[taskIndex].status = newStatus;
    saveTasks();
    renderTasks(); 
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.target.classList.add('dragging');
}

function drop(ev) {
    ev.preventDefault();
    const taskId = ev.dataTransfer.getData("text");
    const draggedElement = document.getElementById(taskId);
    draggedElement.classList.remove('dragging');

    let targetList = ev.target;
    while (!targetList.classList.contains('task-list')) {
        targetList = targetList.parentElement;
        if (!targetList) return;
    }

    targetList.appendChild(draggedElement);

    const newStatus = targetList.dataset.status;
    const taskIndex = tasks.findIndex(task => `task-${task.id}` === taskId);

    if (taskIndex !== -1) {
        tasks[taskIndex].status = newStatus;
        saveTasks();
    }
}

function updateProgress() {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(task => task.status === 'done').length;

    let percentage = 0;
    if (totalTasks > 0) {
        percentage = Math.round((doneTasks / totalTasks) * 100);
    }

    progressBar.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;
}


// =========================================================
//                   2. FUNÇÕES POMODORO
// =========================================================

function updateTimerDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    timerDisplay.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function switchMode() { 
    if (isStudyMode) {
        currentTime = BREAK_TIME;
        timerStatus.textContent = 'Pausa Curta';
        timerDisplay.style.color = 'var(--low-priority)'; 
        isStudyMode = false;
    } else {
        cyclesCompleted++;
        cyclesCountDisplay.textContent = cyclesCompleted;
        currentTime = STUDY_TIME;
        timerStatus.textContent = 'Foco';
        timerDisplay.style.color = 'var(--high-priority)';
        isStudyMode = true;
    }
    updateTimerDisplay();
}

function startTimer() { 
    if (isRunning) return;
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pomodoroInterval = setInterval(() => {
        currentTime--;
        updateTimerDisplay();
        if (currentTime <= 0) {
            clearInterval(pomodoroInterval);
            const message = isStudyMode ? 'Hora da Pausa! (5 minutos)' : 'Hora de Estudar! (25 minutos)';
            console.log(message); 
            switchMode();
            startTimer();
        }
    }, 1000);
}

function pauseTimer() { 
    clearInterval(pomodoroInterval);
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

function resetTimer() { 
    pauseTimer();
    currentTime = STUDY_TIME;
    isStudyMode = true;
    timerStatus.textContent = 'Foco';
    timerDisplay.style.color = 'var(--high-priority)';
    updateTimerDisplay();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}


// =========================================================
//                   3. FUNÇÕES DE FLASHCARD
// =========================================================

function loadFlashcards() {
    const savedFlashcards = localStorage.getItem('studyFlowFlashcards');
    if (savedFlashcards) {
        flashcards = JSON.parse(savedFlashcards);
    }
    // Se houver cards, atualiza o display
    if(flashcards.length > 0) {
        flashcardDisplay.innerHTML = `<p>Você tem ${flashcards.length} cards. Clique em "Revisar".</p>`;
    }
}

function saveFlashcards() {
    localStorage.setItem('studyFlowFlashcards', JSON.stringify(flashcards));
}

function addFlashcard() {
    const text = flashcardInput.value.trim();
    
    if (!text.includes('|') || text.split('|').length < 2) {
        alert('Formato inválido. Use: Frente | Verso');
        return;
    }

    const parts = text.split('|');
    const front = parts[0].trim();
    const back = parts.slice(1).join('|').trim();

    if (front === "" || back === "") {
        alert('A frente e o verso não podem estar vazios.');
        return;
    }

    flashcards.push({ front, back });
    saveFlashcards();
    flashcardInput.value = ''; 
    
    // Feedback de adição
    flashcardDisplay.innerHTML = `<p>Card adicionado! Total: ${flashcards.length}</p>`;
    currentFlashcardIndex = -1; // Reseta a revisão
}

function reviewFlashcard() {
    if (flashcards.length === 0) {
        flashcardDisplay.innerHTML = `<p>Nenhum card para revisar. Adicione um!</p>`;
        reviewFlashcardBtn.textContent = 'Revisar';
        return;
    }
    
    // Seleciona o PRÓXIMO índice ou um índice aleatório se for o primeiro
    if (currentFlashcardIndex === -1 || currentFlashcardIndex === flashcards.length - 1) {
        currentFlashcardIndex = 0; // Começa no primeiro
    } else {
        currentFlashcardIndex++; // Avança para o próximo
    }

    const card = flashcards[currentFlashcardIndex];
    
    // Mostra a frente
    flashcardDisplay.innerHTML = `<p>${card.front}</p>`;
    showingFront = true;
    
    flashcardDisplay.style.color = 'var(--low-priority)'; // Cor padrão para frente
    reviewFlashcardBtn.textContent = 'Próximo Card';
}

function flipFlashcard() {
    if (currentFlashcardIndex === -1 || flashcards.length === 0) {
        reviewFlashcard();
        return;
    }

    const card = flashcards[currentFlashcardIndex];

    if (showingFront) {
        // Mostra o verso
        flashcardDisplay.innerHTML = `<p>${card.back}</p>`;
        flashcardDisplay.style.color = 'var(--high-priority)'; // Cor diferente para o verso
        showingFront = false;
    } else {
        // Mostra a frente
        flashcardDisplay.innerHTML = `<p>${card.front}</p>`;
        flashcardDisplay.style.color = 'var(--low-priority)'; 
        showingFront = true;
    }
}


// =========================================================
//                   4. LISTENERS E INICIALIZAÇÃO
// =========================================================

// Listeners Kanban
addTaskBtn.addEventListener('click', addTask);

// Listeners Pomodoro
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Listeners Flashcard
addFlashcardBtn.addEventListener('click', addFlashcard);
reviewFlashcardBtn.addEventListener('click', reviewFlashcard);
flashcardDisplay.addEventListener('click', flipFlashcard); // Vira o card ao clicar nele

// Inicialização de Funções
window.onload = () => {
    loadTasks();
    loadFlashcards(); 
    updateTimerDisplay();
};

// Expondo funções globais para o HTML
window.allowDrop = allowDrop;
window.drop = drop;
window.deleteTask = deleteTask;
window.changeTaskStatus = changeTaskStatus;