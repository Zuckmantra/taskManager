import { useState } from 'react';

export default function TaskForm({ onSubmit, projects = [] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [expanded, setExpanded] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    await onSubmit(title.trim(), description.trim(), priority, dueDate || null, projectId || null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setProjectId('');
    setExpanded(false);
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <button
        type="button"
        className="task-form-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="icon-plus">＋</span>
        <span>{expanded ? 'Cerrar formulario' : 'Nueva tarea'}</span>
      </button>

      {expanded && (
        <div className="task-form-content">
          <div className="task-form-grid">
            <div className="form-group">
              <label htmlFor="task-title">Título</label>
              <input
                id="task-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="¿Qué necesitas hacer?"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="task-priority">Prioridad</label>
              <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">🟢 Baja</option>
                <option value="medium">🟡 Media</option>
                <option value="high">🔴 Alta</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="task-due">Fecha límite</label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            {projects.length > 0 && (
              <div className="form-group">
                <label htmlFor="task-project">Proyecto</label>
                <select id="task-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group form-group-full">
              <label htmlFor="task-desc">Descripción</label>
              <textarea
                id="task-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Agrega detalles opcionales..."
              />
            </div>
          </div>
          <div className="task-form-actions">
            <button type="submit" className="btn btn-primary">
              ✓ Crear tarea
            </button>
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => setExpanded(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
