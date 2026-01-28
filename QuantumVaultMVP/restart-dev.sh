#!/bin/bash

# Kill existing processes on ports 3000 (Frontend) and 13000 (Backend)
echo "Stopping existing services..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:13000 | xargs kill -9 2>/dev/null || true

# Wait for cleanup
sleep 2

# Start Backend
echo "Starting Backend..."
cd backend
npm run start:dev > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

# Start Frontend
echo "Starting Frontend..."
cd ../frontend
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID $FRONTEND_PID"

echo "Services restarted. Backend logs in backend/backend.log, Frontend logs in frontend/frontend.log"
