requireAuth();

const API_URL = 'http://localhost:3000/api';

const tasksContainer = document.getElementById('tasksContainer');
const addTaskForm = document.getElementById('addTaskForm');
const userNameEl = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

const user = getUser();
if (user) {
  userNameEl.textContent = `Hola, ${user.username}`;
}

logoutBtn.addEventListener('click', () => {
  logout();
});

async function loadTasks() {
  try {
    const response = await authFetch(`${API_URL}/tasks`);
    
    if (!response.ok) {
      throw new Error('Error al cargar tareas');
    }
    
    const tasks = await response.json();
    renderTasks(tasks);
  } catch (error) {
    console.error('Error:', error);
    tasksContainer.innerHTML = '<div class="empty-state">Error al cargar las tareas</div>';
  }
}

function renderTasks(tasks) {
  if (tasks.length === 0) {
    tasksContainer.innerHTML = '<div class="empty-state">No hay tareas. ¡Crea una nueva!</div>';
    return;
  }
  
  tasksContainer.innerHTML = tasks.map(task => createTaskHTML(task)).join('');
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteTask(e.target.dataset.id));
  });
  
  document.querySelectorAll('.complete-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => toggleComplete(e.target.dataset.id, e.target.checked));
  });
  
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => showEditForm(e.target.dataset.id));
  });
  
  document.querySelectorAll('.save-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => saveEdit(e.target.dataset.id));
  });
  
  document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => cancelEdit(e.target.dataset.id));
  });
}

function createTaskHTML(task) {
  const editForm = `
    <div class="edit-form" id="edit-form-${task.id}">
      <input type="text" id="edit-title-${task.id}" value="${escapeHTML(task.title)}">
      <textarea id="edit-description-${task.id}">${escapeHTML(task.description || '')}</textarea>
      <div>
        <button class="btn btn-success btn-sm save-edit-btn" data-id="${task.id}">Guardar</button>
        <button class="btn btn-outline btn-sm cancel-edit-btn" data-id="${task.id}">Cancelar</button>
      </div>
    </div>
  `;
  
  return `
    <div class="task-item ${task.completed ? 'completed' : ''}" id="task-${task.id}">
      <div class="task-content">
        <div class="task-title">${escapeHTML(task.title)}</div>
        ${task.description ? `<div class="task-description">${escapeHTML(task.description)}</div>` : ''}
        ${editForm}
      </div>
      <div class="task-actions">
        <div class="checkbox-wrapper">
          <input type="checkbox" class="complete-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
        </div>
        <button class="btn btn-outline btn-sm edit-btn" data-id="${task.id}">Editar</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${task.id}">Eliminar</button>
      </div>
    </div>
  `;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

addTaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('taskTitle').value;
  const description = document.getElementById('taskDescription').value;
  
  try {
    const response = await authFetch(`${API_URL}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title, description })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear tarea');
    }
    
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    
    loadTasks();
  } catch (error) {
    alert(error.message);
  }
});

async function deleteTask(id) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
    return;
  }
  
  try {
    const response = await authFetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar tarea');
    }
    
    loadTasks();
  } catch (error) {
    alert(error.message);
  }
}

async function toggleComplete(id, completed) {
  const taskEl = document.getElementById(`task-${id}`);
  const title = taskEl.querySelector('.task-title').textContent;
  const description = taskEl.querySelector('.task-description')?.textContent || '';
  
  try {
    const response = await authFetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description, completed })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar tarea');
    }
    
    loadTasks();
  } catch (error) {
    alert(error.message);
  }
}

function showEditForm(id) {
  const editForm = document.getElementById(`edit-form-${id}`);
  editForm.classList.add('active');
}

function cancelEdit(id) {
  const editForm = document.getElementById(`edit-form-${id}`);
  editForm.classList.remove('active');
}

async function saveEdit(id) {
  const title = document.getElementById(`edit-title-${id}`).value;
  const description = document.getElementById(`edit-description-${id}`).value;
  const taskEl = document.getElementById(`task-${id}`);
  const completed = taskEl.querySelector('.complete-checkbox').checked;
  
  if (!title.trim()) {
    alert('El título no puede estar vacío');
    return;
  }
  
  try {
    const response = await authFetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description, completed })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar tarea');
    }
    
    loadTasks();
  } catch (error) {
    alert(error.message);
  }
}

loadTasks();