#!/bin/bash

echo "Starting Web3 Stock Trader Application..."

# Terminal 1: Start Hardhat node
echo "Starting Hardhat local node..."
#!/bin/bash

# Start the crypto trading bot application

echo "Starting Crypto Trading Bot..."

# Check if MongoDB is running
if ! pgrep mongod > /dev/null; then
    echo "Starting MongoDB..."
    sudo systemctl start mongod
    # Wait for MongoDB to start
    sleep 3
fi

# Start the backend server
echo "Starting backend server..."
cd server
npm run dev &
SERVER_PID=$!

# Wait a moment for the backend to start
sleep 3

# Start the frontend in development mode
echo "Starting frontend..."
cd ../client
npm start &
CLIENT_PID=$!

# Function to stop the application
stop_app() {
    echo "Stopping application..."
    kill $SERVER_PID $CLIENT_PID
    exit 0
}

# Handle termination signals
trap stop_app SIGINT SIGTERM

# Wait for processes to finish
wait $SERVER_PID $CLIENT_PID

# Wait a moment for the node to start
sleep 3

# Deploy contracts to the local node
echo "Deploying contracts..."
npx hardhat run scripts/deploy.js --network localhost

echo "Contracts deployed successfully!"
echo "Server will start on http://localhost:5000"
echo "For the frontend, you'll need to run 'npm start' in the client directory separately"