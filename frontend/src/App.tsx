import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { PlusCircle, AlertCircle, X, Wallet } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const expenseSchema = z.object({
  amount: z.number({ message: 'Amount is required' }).min(0.01, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

const CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Other'];

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    }
  });

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (dateFilter) params.append('date', dateFilter);
      params.append('sort', 'date_desc'); // Always sort by date newest first
      params.append('t', Date.now().toString()); // Cache buster

      const response = await axios.get(`${API_URL}/expenses?${params.toString()}`);
      setExpenses(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load expenses. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, dateFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchExpenses();
  }, [fetchExpenses]);

  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      setError(null);
      // eslint-disable-next-line react-hooks/purity
      const idempotencyKey = window.crypto && window.crypto.randomUUID 
        ? window.crypto.randomUUID() 
        // eslint-disable-next-line react-hooks/purity
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      await axios.post(`${API_URL}/expenses`, data, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        timeout: 10000,
      });

      reset({ date: new Date().toISOString().split('T')[0] });
      setIsFormOpen(false); // Close modal on success
      fetchExpenses(); // Refresh list
    } catch (err) {
      console.error(err);
      setError('Failed to create expense. Please try again.');
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="container">
      <header className="header">
        <div className="header-title">
          <h1>Fenmo</h1>
          <p>Track your money, master your life.</p>
        </div>
        <div className="total-display">
          <Wallet size={24} />
          <span>₹{totalAmount.toFixed(2)}</span>
        </div>
      </header>

      {error && !isFormOpen && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="filters">
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Filter by Date"
          />

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <button onClick={() => setIsFormOpen(true)} className="btn btn-primary">
          <PlusCircle size={20} />
          New Expense
        </button>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="loader" style={{ borderTopColor: 'var(--primary)', width: '32px', height: '32px', borderWidth: '4px' }}></div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <Wallet size={48} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
          <h3>No expenses found</h3>
          <p style={{ marginTop: '0.5rem' }}>Click "New Expense" to add your first entry.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{format(new Date(expense.date), 'MMM d, yyyy')}</div>
                  </td>
                  <td>{expense.description || '-'}</td>
                  <td>
                    <span className="badge">{expense.category}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                    ₹{expense.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Expense Modal */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Expense</h2>
              <button className="modal-close" onClick={() => setIsFormOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    {...register('amount', { valueAsNumber: true })}
                    autoFocus
                  />
                  {errors.amount && <span className="form-error">{errors.amount.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" {...register('category')}>
                    <option value="">Select a category</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && <span className="form-error">{errors.category.message}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="What did you buy?"
                    {...register('description')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    {...register('date')}
                  />
                  {errors.date && <span className="form-error">{errors.date.message}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="loader" style={{ marginRight: '0.5rem' }}></span>
                  ) : (
                    <PlusCircle size={20} />
                  )}
                  {isSubmitting ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
