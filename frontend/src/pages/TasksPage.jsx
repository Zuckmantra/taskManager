import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TasksPage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');

  async function loadProjects() {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      // ignore errors for projects
    }
  }

  async function loadTasks(p = 1) {
    setLoading(true);
    setError('');

    try {
      const params = {
        page: String(p),
        limit: String(limit),
        sort: sortBy
      };
      if (query) params.q = query;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      const res = await api.getTasks(params);

      if (Array.isArray(res)) {
        if (p === 1) setTasks(res);
        else setTasks((prev) => prev.concat(res));
        setPage(p);
        setTotal(res.length);
      } else {
        const tasksArray = res?.tasks || [];
        if (p === 1) setTasks(tasksArray);
        else setTasks((prev) => prev.concat(tasksArray));
        setPage(res?.page || p);
        setTotal(res?.total || 0);
      }
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes('token')) logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    loadTasks(1);

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data || []);
        }
      } catch (e) {
        // ignore
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  async function handleCreate(title, description, priority, due_date, project_id) {
    const newTask = await api.createTask(title, description, priority, due_date, project_id);
    setTasks((prev) => [newTask, ...prev]);
    setTotal((prev) => prev + 1);
  }

  async function handleDelete(id) {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  }

  async function handleToggle(task, completed) {
    // Actualizar optimistamente en el estado local
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed } : t))
    );

    try {
      await api.updateTask(task.id, {
        title: task.title,
        description: task.description || '',
        completed
      });
    } catch (err) {
      // Revertir en caso de error
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !completed } : t))
      );
    }
  }

  async function handleSave(id, payload) {
    await api.updateTask(id, payload);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...payload } : t))
    );
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
        if (filter === 'pending') return !task.completed;
        if (filter === 'completed') return task.completed;
        return true;
      })
      .filter((task) => {
        if (priorityFilter === 'all') return true;
        return (task.priority || 'medium') === priorityFilter;
      })
      .filter((task) => {
        if (!normalizedQuery) return true;
        const title = task.title.toLowerCase();
        const description = (task.description || '').toLowerCase();
        return title.includes(normalizedQuery) || description.includes(normalizedQuery);
      });
  }, [tasks, filter, query, priorityFilter]);

  const sortedTasks = useMemo(() => {
    const list = [...visibleTasks];
    if (sortBy === 'due_date') {
      list.sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));
    } else if (sortBy === 'priority') {
      const order = { high: 0, medium: 1, low: 2 };
      list.sort((a, b) => (order[a.priority || 'medium'] - order[b.priority || 'medium']));
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [visibleTasks, sortBy]);

  const hasActiveFilters = filter !== 'all' || priorityFilter !== 'all' || query;

  function clearFilters() {
    setFilter('all');
    setPriorityFilter('all');
    setQuery('');
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <p className="eyebrow">Panel de tareas</p>
          <h1>Hola, {user?.username || 'Usuario'}</h1>
        </div>
        <div className="header-right">
          <button
            className="btn-icon"
            type="button"
            onClick={() => setShowNotifications((s) => !s)}
            aria-label="Notificaciones"
          >
            <span className="icon-bell">🔔</span>
            {notifications.length > 0 && (
              <span className="badge">{notifications.length}</span>
            )}
          </button>
          <button className="btn btn-soft" onClick={logout} type="button">
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card stat-total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <p>Total</p>
            <strong>{stats.total}</strong>
          </div>
        </article>
        <article className="stat-card stat-pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <p>Pendientes</p>
            <strong>{stats.pending}</strong>
          </div>
        </article>
        <article className="stat-card stat-completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <p>Completadas</p>
            <strong>{stats.completed}</strong>
          </div>
        </article>
      </section>

      <section className="task-toolbar">
        <div className="toolbar-search">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="🔍  Buscar por título o descripción..."
            aria-label="Buscar tareas"
          />
        </div>
        <div className="toolbar-filters">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filtrar por prioridad"
          >
            <option value="all">Todas las prioridades</option>
            <option value="low">🟢 Baja</option>
            <option value="medium">🟡 Media</option>
            <option value="high">🔴 Alta</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Ordenar tareas"
          >
            <option value="created_at">📅 Fecha de creación</option>
            <option value="due_date">⏰ Fecha de vencimiento</option>
            <option value="priority">🎯 Prioridad</option>
          </select>
          <div className="filter-tabs" role="tablist" aria-label="Filtros de tareas">
            <button
              type="button"
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todas
            </button>
            <button
              type="button"
              className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pendientes
            </button>
            <button
              type="button"
              className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Hechas
            </button>
          </div>
        </div>
      </section>

      {hasActiveFilters && (
        <div className="active-filters">
          <span className="filter-label">Filtros activos:</span>
          {query && <span className="filter-chip">Búsqueda: "{query}"</span>}
          {filter !== 'all' && (
            <span className="filter-chip">
              Estado: {filter === 'pending' ? 'Pendientes' : 'Completadas'}
            </span>
          )}
          {priorityFilter !== 'all' && (
            <span className="filter-chip">
              Prioridad: {priorityFilter === 'low' ? 'Baja' : priorityFilter === 'medium' ? 'Media' : 'Alta'}
            </span>
          )}
          <button className="btn-clear-filters" onClick={clearFilters}>
            ✕ Limpiar
          </button>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}
      {loading && <LoadingSpinner message="Cargando tareas..." />}

      {!loading && (
        <>
          <TaskForm onSubmit={handleCreate} projects={projects} />
          <TaskList
            tasks={sortedTasks}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onSave={handleSave}
          />
          {tasks.length < total && (
            <div className="pagination">
              <button
                className="btn btn-soft"
                onClick={() => loadTasks(page + 1)}
              >
                Cargar más tareas
              </button>
              <span className="pagination-info">
                Mostrando {tasks.length} de {total} tareas
              </span>
            </div>
          )}

          {showNotifications && (
            <section className="notifications-panel">
              <div className="notifications-header">
                <h3>Notificaciones</h3>
                <button
                  className="btn-close"
                  onClick={() => setShowNotifications(false)}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="empty-state-small">No hay notificaciones.</p>
              ) : (
                <ul className="notifications-list">
                  {notifications.map((n) => (
                    <li key={n.id} className="notification-item">
                      <span className="notification-title">{n.title}</span>
                      {n.due_date && (
                        <span className="notification-due">
                          Vence: {new Intl.DateTimeFormat('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          }).format(new Date(n.due_date))}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
