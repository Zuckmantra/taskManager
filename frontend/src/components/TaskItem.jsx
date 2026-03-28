import { useState } from 'react';

export default function TaskItem({ task, onToggle, onDelete, onSave }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');

  const createdAt = task.created_at
    ? new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(task.created_at))
    : null;

  async function handleSave() {
    if (!title.trim()) {
      return;
    }

    await onSave(task.id, {
      title: title.trim(),
      description: description.trim(),
      completed: task.completed
    });

    setEditing(false);
  }

  return (
    <article className={`task-item ${task.completed ? 'completed' : ''}`}>
      <div className="task-body">
        {!editing && <h3>{task.title}</h3>}
        {!editing && task.description && <p>{task.description}</p>}
        {!editing && createdAt && <small>Creada: {createdAt}</small>}

        {editing && (
          <div className="edit-grid">
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
        )}
      </div>

      <div className="task-actions">
        <label className="check-pill">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={(event) => onToggle(task, event.target.checked)}
          />
          <span>{task.completed ? 'Hecha' : 'Pendiente'}</span>
        </label>

        {!editing && (
          <button type="button" className="btn btn-soft" onClick={() => setEditing(true)}>
            Editar
          </button>
        )}

        {editing && (
          <button type="button" className="btn btn-success" onClick={handleSave}>
            Guardar
          </button>
        )}

        {editing && (
          <button type="button" className="btn btn-soft" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        )}

        <button type="button" className="btn btn-danger" onClick={() => onDelete(task.id)}>
          Eliminar
        </button>
      </div>
    </article>
  );
}
