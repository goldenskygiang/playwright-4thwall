# Use the official Playwright Docker image as base
FROM mcr.microsoft.com/playwright:v1.55.0-jammy

# Set working directory
WORKDIR /app

# Install Python, pip, desktop environment, and VNC server
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    xvfb \
    xfce4 \
    xfce4-goodies \
    tigervnc-standalone-server \
    tigervnc-common \
    tigervnc-tools \
    dbus-x11 \
    x11-xserver-utils \
    x11-xkb-utils \
    xkbset \
    curl \
    wget \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Copy package.json and install Node.js dependencies
COPY package.json .
RUN npm install

# Copy the rest of the application
COPY . .

# Install Playwright browsers (they should already be in the base image, but ensure they're available)
RUN npx playwright install --with-deps

# Copy startup scripts
COPY start.sh .
RUN chmod +x start.sh

# Expose ports for VNC
EXPOSE 5901

# Set environment variables
ENV DISPLAY=:1
ENV PLAYWRIGHT_HEADED=true
ENV VNC_RESOLUTION=1280x1024

# Default command runs tests, but can be overridden for desktop mode
CMD ["./start.sh"]