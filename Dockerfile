FROM node:20-alpine

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
