# Use Debian-based Node (glibc required by Chromium — Alpine/musl WILL NOT work)
FROM node:20-slim

# Install Chromium + all shared libraries it needs
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium, not download its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Define build arguments that Render will pass automatically during build
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_SECURE_ROOM_API_ENDPOINT
ARG VITE_WEBSOCKET_URL
ARG VITE_EMAIL_USER

# Set them as environment variables so they are available during `npm run build`
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_SECURE_ROOM_API_ENDPOINT=$VITE_SECURE_ROOM_API_ENDPOINT
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL
ENV VITE_EMAIL_USER=$VITE_EMAIL_USER

# Run the build script to generate the /dist folder for the frontend
RUN npm run build

# Expose the port the Node server relies on
EXPOSE 8080

# Start the monolith server
CMD ["npm", "run", "start"]
