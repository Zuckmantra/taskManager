# TaskManager

Aplicacion full stack para gestion de tareas con autenticacion JWT, frontend modular con React y backend Node.js + MySQL.

## Stack

- Backend: Node.js, Express, MySQL2, JWT, bcrypt
- Frontend: React + Vite (modular)
- Base de datos: MySQL (compatible con MySQL Workbench)

## Estructura

```
taskManager/
├── backend/
│   ├── package.json
│   └── server.js
├── database/
│   └── script.sql
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── api/client.js
│       ├── context/AuthContext.jsx
│       ├── components/
│       └── pages/
└── README.md
```

## Requisitos

- Node.js 18+
- MySQL 8+ (o 5.7+)
- MySQL Workbench (opcional, recomendado)

## Configuracion de MySQL en Workbench

1. Abre MySQL Workbench y conectate a tu servidor local.
2. Crea un schema llamado `taskmanager` (si no existe).
3. Abre y ejecuta el archivo `database/script.sql` completo.
4. Verifica que existan las tablas `users` y `tasks`.

## Variables de entorno backend

Crea el archivo `backend/.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=taskmanager
JWT_SECRET=cambia_este_secreto
PORT=3000
```

## Instalacion

1. Instalar backend:

```bash
cd backend
npm install
```

2. Instalar frontend:

```bash
cd ../frontend
npm install
```

## Ejecucion

1. Levantar backend:

```bash
cd backend
npm run dev
```

2. Levantar frontend React:

```bash
cd frontend
npm run dev
```

3. Abre la app en:

```text
http://localhost:5173
```

`vite.config.js` ya trae proxy de `/api` hacia `http://localhost:3000`, por eso no necesitas tocar CORS para desarrollo local.

## API disponible

- `POST /api/register`
- `POST /api/login`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

## Mejoras aplicadas

- Frontend migrado a React modular (componentes, contexto y paginas).
- Estilos CSS renovados con diseno responsive.
- Integracion frontend/backend por proxy de Vite.
- Flujo de autenticacion y CRUD centralizado en cliente API.
