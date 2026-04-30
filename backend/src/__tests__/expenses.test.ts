import request from 'supertest';
import app from '../index';
import db from '../db';

describe('Expenses API', () => {
  // Wait for DB to be ready
  beforeAll((done) => {
    // Basic trick to ensure schema runs
    setTimeout(done, 500);
  });

  afterAll((done) => {
    db.end();
    done();
  });

  it('should fetch an empty list of expenses', async () => {
    const res = await request(app).get('/expenses');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should create a new expense', async () => {
    const newExpense = {
      amount: 120.5,
      category: 'Food',
      description: 'Groceries',
      date: '2026-04-30',
    };

    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', 'test-key-1')
      .send(newExpense);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.amount).toBe(120.5);
    expect(res.body.category).toBe('Food');
  });

  it('should reject duplicate idempotency key (ignore insert)', async () => {
    const newExpense = {
      amount: 50,
      category: 'Utilities',
      date: '2026-05-01',
    };

    // Attempt 1
    await request(app)
      .post('/expenses')
      .set('Idempotency-Key', 'test-key-2')
      .send(newExpense);

    // Attempt 2
    const res2 = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', 'test-key-2')
      .send(newExpense);

    expect(res2.status).toBe(200);
    expect(res2.body.message).toBe('Expense already created (idempotent response)');
  });

  it('should reject invalid expense data', async () => {
    const invalidExpense = {
      amount: -10, // Invalid: negative amount
      category: 'Food',
      date: '2026-04-30',
    };

    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', 'test-key-3')
      .send(invalidExpense);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid expense data');
  });
});
