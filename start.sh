#!/bin/bash

# Set VNC password
echo "Setting up VNC..."
mkdir -p ~/.vnc
echo "password" | vncpasswd -f > ~/.vnc/passwd
chmod 600 ~/.vnc/passwd

# Create VNC startup script
cat > ~/.vnc/xstartup << EOF
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
export XKL_XMODMAP_DISABLE=1
export XDG_CURRENT_DESKTOP="XFCE"
export XDG_MENU_PREFIX="xfce-"

# Start XFCE desktop environment
startxfce4 &

# Keep the session running
while true; do
    sleep 1000
done
EOF

chmod +x ~/.vnc/xstartup

# Start VNC server
echo "Starting VNC server on :1..."
vncserver :1 -geometry $VNC_RESOLUTION -depth 24 -localhost no

# Start dbus for desktop environment
echo "Starting dbus..."
eval $(dbus-launch --sh-syntax)
export DBUS_SESSION_BUS_ADDRESS

# Wait for VNC server to start
sleep 3

# Update DISPLAY to use VNC display
export DISPLAY=:1

# Start the Flask server in the background
echo "Starting Flask server..."
python3 ./keyboard_ctrl_server/main.py > /dev/null 2>&1 &
FLASK_PID=$!

# Wait for Flask server to start
echo "Waiting for Flask server to be ready..."
sleep 5

# Check if Flask server is running
if curl -s http://localhost:5001/ > /dev/null; then
    echo "Flask server is ready!"
else
    echo "Flask server failed to start. Checking logs..."
    ps aux | grep python3
    exit 1
fi

echo "==================================="
echo "Desktop environment is ready!"
echo "VNC Server: localhost:5901"
echo "VNC Password: password"
echo "Flask Server: http://localhost:5001"
echo "==================================="

xset r off

# Check if we should run tests or just start desktop
if [ "$1" = "desktop" ]; then
    echo "Desktop mode - keeping container running..."

    # Keep container running for desktop access
    while true; do
        sleep 3600
    done
else
    # Run Playwright tests in headed mode
    echo "Running Playwright tests..."
    npx playwright test --headed
    
    # Capture test exit code
    TEST_EXIT_CODE=$?
    
    # Cleanup: Stop Flask server
    echo "Stopping Flask server..."
    kill $FLASK_PID 2>/dev/null || true
    
    # Stop VNC server
    echo "Stopping VNC server..."
    vncserver -kill :1 2>/dev/null || true
    
    # Exit with the same code as the tests
    exit $TEST_EXIT_CODE
fi