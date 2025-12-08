#!/bin/bash
# Start Docker
docker-compose up -d

# Start Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
# Run in background
nohup npm start > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Start Frontend
cd ../frontend
npm install
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

echo "QuantumVault MVP is running."
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
