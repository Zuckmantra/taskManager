import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';

export default function TasksPage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  async function loadTasks() {
    setLoading(true);
    setError('');

    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes('token')) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleCreate(title, description) {
    await api.createTask(title, description);
    await loadTasks();
  }

  async function handleDelete(id) {
    await api.deleteTask(id);
    await loadTasks();
  }

  async function handleToggle(task, completed) {
    await api.updateTask(task.id, {
      title: task.title,
      description: task.description || '',
      completed
    });
    await loadTasks();
  }

  async function handleSave(id, payload) {
    await api.updateTask(id, payload);
    await loadTasks();
  }

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const pending = total - completed;

    return { total, pending, completed };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tasks
      .filter((task) => {
        if (filter === 'pending') {
          return !task.completed;
        }

        if (filter === 'completed') {
          return task.completed;
        }

        return true;
      })
      .filter((task) => {
        if (!normalizedQuery) {
          return true;
        }

        const title = task.title.toLowerCase();
        const description = (task.description || '').toLowerCase();
        return title.includes(normalizedQuery) || description.includes(normalizedQuery);
      });
  }, [tasks, filter, query]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Panel de tareas</p>
          <h1>Hola, {user?.username || 'Usuario'}</h1>
        </div>
        <button className="btn btn-soft" onClick={logout} type="button">
          Cerrar sesion
        </button>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <p>Total</p>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <p>Pendientes</p>
          <strong>{stats.pending}</strong>
        </article>
        <article className="stat-card">
          <p>Completadas</p>
          <strong>{stats.completed}</strong>
        </article>
      </section>

      <section className="task-toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por titulo o descripcion"
          aria-label="Buscar tareas"
        />
        <div className="filter-row" role="tablist" aria-label="Filtros de tareas">
          <button
            type="button"
            className={`btn btn-soft ${filter === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas
          </button>
          <button
            type="button"
            className={`btn btn-soft ${filter === 'pending' ? 'is-active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pendientes
          </button>
          <button
            type="button"
            className={`btn btn-soft ${filter === 'completed' ? 'is-active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Hechas
          </button>
        </div>
      </section>

      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading">Cargando tareas...</p>}

      {!loading && (
        <>
          <TaskForm onSubmit={handleCreate} />
          <TaskList
            tasks={visibleTasks}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onSave={handleSave}
          />
        </>
      )}
    </main>
  );
}
