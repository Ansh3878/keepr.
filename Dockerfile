FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Run the build script to generate the /dist folder for the frontend
RUN npm run build

# Expose the port the Node server relies on
EXPOSE 3001

# Start the monolith server
CMD ["npm", "run", "start"]
