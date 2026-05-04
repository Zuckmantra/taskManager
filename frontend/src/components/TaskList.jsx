import TaskItem from './TaskItem';

export default function TaskList({ tasks, onToggle, onDelete, onSave }) {
  if (!tasks.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <h3>No hay tareas</h3>
        <p>Crea una nueva tarea usando el formulario de arriba para comenzar.</p>
      </div>
    );
  }

  return (
    <section className="task-list">
      <div className="task-list-header">
        <h2>Tus tareas</h2>
        <span className="task-count">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="task-stack">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
            onSave={onSave}
          />
        ))}
      </div>
    </section>
  );
}
