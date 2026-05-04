import { useState } from 'react';

export default function TaskItem({ task, onToggle, onDelete, onSave }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '');

  const createdAt = task.created_at
    ? new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(task.created_at))
    : null;

  const dueDateFormatted = task.due_date
    ? new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(task.due_date))
    : null;

  const isOverdue = dueDateFormatted && !task.completed && new Date(task.due_date) < new Date();

  const priorityConfig = {
    low: { label: 'Baja', class: 'priority-low', icon: '🟢' },
    medium: { label: 'Media', class: 'priority-medium', icon: '🟡' },
    high: { label: 'Alta', class: 'priority-high', icon: '🔴' }
  };

  const currentPriority = priorityConfig[priority] || priorityConfig.medium;

  async function handleSave() {
    if (!title.trim()) {
      return;
    }

    await onSave(task.id, {
      title: title.trim(),
      description: description.trim(),
      completed: task.completed,
      priority,
      due_date: dueDate || null
    });

    setEditing(false);
  }

  return (
    <article className={`task-item ${task.completed ? 'completed' : ''}`}>
      <div className="task-checkbox">
        <label className="custom-checkbox">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={(event) => onToggle(task, event.target.checked)}
          />
          <span className="checkmark">✓</span>
        </label>
      </div>

      <div className="task-body">
        {!editing && (
          <>
            <div className="task-header">
              <h3>{task.title}</h3>
              <span className={`priority-badge ${currentPriority.class}`}>
                {currentPriority.icon} {currentPriority.label}
              </span>
            </div>
            {task.description && <p className="task-description">{task.description}</p>}
            <div className="task-meta">
              {dueDateFormatted && (
                <span className={`task-date ${isOverdue ? 'overdue' : ''}`}>
                  {isOverdue ? '⚠️' : '📅'} Vence: {dueDateFormatted}
                </span>
              )}
              {createdAt && <span className="task-date">📆 Creada: {createdAt}</span>}
            </div>
          </>
        )}

        {editing && (
          <div className="edit-grid">
            <div className="form-group">
              <label htmlFor={`edit-title-${task.id}`}>Título</label>
              <input
                id={`edit-title-${task.id}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor={`edit-priority-${task.id}`}>Prioridad</label>
              <select
                id={`edit-priority-${task.id}`}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">🟢 Baja</option>
                <option value="medium">🟡 Media</option>
                <option value="high">🔴 Alta</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor={`edit-due-${task.id}`}>Fecha límite</label>
              <input
                id={`edit-due-${task.id}`}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="form-group form-group-full">
              <label htmlFor={`edit-desc-${task.id}`}>Descripción</label>
              <textarea
                id={`edit-desc-${task.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="task-actions">
        {!editing && (
          <>
            <button
              type="button"
              className="btn-icon btn-edit"
              onClick={() => setEditing(true)}
              aria-label="Editar"
            >
              ✏️
            </button>
            <button
              type="button"
              className="btn-icon btn-delete"
              onClick={() => onDelete(task.id)}
              aria-label="Eliminar"
            >
              🗑️
            </button>
          </>
        )}

        {editing && (
          <>
            <button type="button" className="btn btn-success btn-sm" onClick={handleSave}>
              Guardar
            </button>
            <button
              type="button"
              className="btn btn-soft btn-sm"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </article>
  );
}
