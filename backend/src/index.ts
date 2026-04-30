import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import db from './db';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

interface ExpenseRequest {
  amount: number;
  category: string;
  description?: string;
  date: string;
}

// Validation helper
const isValidExpense = (data: any): data is ExpenseRequest => {
  return (
    typeof data.amount === 'number' &&
    data.amount > 0 &&
    typeof data.category === 'string' &&
    typeof data.date === 'string' &&
    !isNaN(Date.parse(data.date))
  );
};

// GET /expenses
app.get('/expenses', (req: Request, res: Response) => {
  const { category, sort, date } = req.query;
  
  let query = 'SELECT * FROM expenses';
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  if (date) {
    conditions.push('date = ?');
    params.push(date);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  if (sort === 'date_desc') {
    query += ' ORDER BY date DESC';
  } else if (sort === 'date_asc') {
    query += ' ORDER BY date ASC';
  } else {
    query += ' ORDER BY created_at DESC';
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch expenses' });
    }
    res.json(rows);
  });
});

// POST /expenses
app.post('/expenses', (req: Request, res: Response) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  // Check if idempotency key exists
  db.get('SELECT key FROM idempotency_keys WHERE key = ?', [idempotencyKey], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (row) {
      // If key exists, it means we already processed this request.
      // We could store the previous response, but for simplicity, we'll just return a success message.
      return res.status(200).json({ message: 'Expense already created (idempotent response)' });
    }

    // Validate request
    if (!isValidExpense(req.body)) {
      return res.status(400).json({ error: 'Invalid expense data' });
    }

    const { amount, category, description, date } = req.body;
    const id = crypto.randomUUID();

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(
        'INSERT INTO idempotency_keys (key) VALUES (?)',
        [idempotencyKey],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to save idempotency key' });
          }
        }
      );

      db.run(
        'INSERT INTO expenses (id, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
        [id, amount, category, description || null, date],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create expense' });
          }
          
          db.run('COMMIT', (err) => {
            if (err) {
              return res.status(500).json({ error: 'Transaction failed' });
            }
            res.status(201).json({ id, amount, category, description, date });
          });
        }
      );
    });
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

export default app;
