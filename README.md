# Fenmo - Personal Expense Tracker

A simple, robust full-stack application to track personal expenses, designed for real-world usage conditions like network retries and failures.

## Tech Stack
- **Backend**: Node.js + Express + TypeScript + PostgreSQL (`pg`)
- **Frontend**: React + TypeScript + Vite + Vanilla CSS
- **Validation**: Zod + React Hook Form
- **Testing**: Jest + Supertest (Backend)

## Key Design Decisions
1. **Idempotency for Retries**: The backend expects an `Idempotency-Key` header on POST requests. It uses this key to safely ignore retries (e.g. from network failures or multiple button clicks). If a request with the same key is received, it avoids creating duplicate expenses.
2. **PostgreSQL Database**: Migrated to PostgreSQL to ensure data persistence on cloud deployments (like Render) and provide robust transaction handling. The app uses the `pg` client to connect using a `DATABASE_URL`.
3. **Vanilla CSS Design System**: Created a fully custom CSS design system relying on variables for a cohesive, rich aesthetic while maintaining full control over the UI, as required.
4. **Automated Integration Tests**: Added backend tests using Jest and Supertest to verify idempotency mechanisms, endpoints, and input validation logic automatically (`npm run test`).

## Trade-offs Made
1. **Pagination**: Did not implement backend/frontend pagination for the expenses list. In a real application with years of data, pagination or infinite scrolling is necessary.
2. **Comprehensive Idempotency**: The idempotency mechanism simply ignores duplicate inserts and returns a success message rather than saving the exact original HTTP response and returning that identical payload.

## What I Intentionally Did Not Do
1. **Authentication**: Skipped adding user auth (e.g. JWTs or sessions). It currently operates as a single-user application.
2. **TailwindCSS**: Explicitly avoided Tailwind to ensure standard CSS was used for styling the components, adhering strictly to the assignment's instructions.

## How to Run

### 1. Database Setup
You will need a running PostgreSQL database. Create a `.env` file in the `backend` directory with your database connection string:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/fenmo"
```

### 2. Start the Backend
```bash
cd backend
npm install
npm run dev
```
*(Runs on port 3000)*

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*(Runs on Vite's default port, e.g. 5173)*
