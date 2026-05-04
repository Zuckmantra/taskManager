const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn()
}));

const mysql = require('mysql2/promise');

const { app, initDB } = require('../server');

let mockPool;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

  // create a mock pool with a query function we can control
  mockPool = {
    query: jest.fn((sql, params) => {
      // simple heuristics to simulate DB responses based on query
      if (sql.includes('SELECT id FROM users WHERE')) {
        // registration uniqueness check
        return Promise.resolve([[]]);
      }

      if (sql.startsWith('INSERT INTO users')) {
        return Promise.resolve([{ insertId: 1 }]);
      }

      if (sql.startsWith('SELECT * FROM users WHERE email')) {
        // For login: return a user with hashed password
        const hashed = bcrypt.hashSync('pass1234', 10);
        return Promise.resolve([[{ id: 1, username: 'juan', email: params[0], password: hashed }]]);
      }

      if (sql.startsWith('INSERT INTO tasks')) {
        return Promise.resolve([{ insertId: 10 }]);
      }

      if (sql.startsWith('SELECT * FROM tasks WHERE id =')) {
        return Promise.resolve([[{ id: params[0], user_id: 1, title: 't', description: 'd', completed: false }]]);
      }

      if (sql.includes('SELECT * FROM tasks WHERE user_id')) {
        return Promise.resolve([[{ id: 10, user_id: params[0], title: 't', description: 'd', completed: false }]]);
      }

      if (sql.startsWith('UPDATE tasks')) {
        return Promise.resolve([{ affectedRows: 1 }]);
      }

      if (sql.startsWith('DELETE FROM tasks')) {
        return Promise.resolve([{ affectedRows: 1 }]);
      }

      return Promise.resolve([[]]);
    })
  };

  mysql.createPool.mockReturnValue(mockPool);

  await initDB();
});

afterAll(() => {
  jest.resetAllMocks();
});

describe('Auth and tasks API', () => {
  test('POST /api/register -> 201', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'juan', email: 'juan@example.com', password: 'pass1234' });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/registrado/i);
  });

  test('POST /api/login -> returns token', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'juan@example.com', password: 'pass1234' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty('email', 'juan@example.com');
  });

  test('Protected routes require token and work', async () => {
    // login first to get token
    const login = await request(app)
      .post('/api/login')
      .send({ email: 'juan@example.com', password: 'pass1234' });

    const token = login.body.token;

    // GET /api/tasks
    const getRes = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);

    // POST /api/tasks
    const postRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Comprar leche', description: 'Ir al mercado' });
    expect(postRes.statusCode).toBe(201);
    expect(postRes.body).toHaveProperty('id');

    // PUT /api/tasks/:id
    const putRes = await request(app)
      .put('/api/tasks/10')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Nueva', description: 'desc', completed: true });
    expect(putRes.statusCode).toBe(200);

    // DELETE /api/tasks/:id
    const delRes = await request(app)
      .delete('/api/tasks/10')
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.statusCode).toBe(200);
  });
});
