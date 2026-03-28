import TaskItem from './TaskItem';

export default function TaskList({ tasks, onToggle, onDelete, onSave }) {
  if (!tasks.length) {
    return <div className="empty-state">No hay tareas que coincidan con el filtro actual.</div>;
  }

  return (
    <section className="task-list">
      <h2>Lista de tareas</h2>
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
