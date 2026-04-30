# Use Node.js LTS version
FROM node:20-slim

# Install Python and dependencies for PDF processing
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Install python requirements if they exist
RUN if [ -f src/scripts/requirements.txt ]; then pip3 install -r src/scripts/requirements.txt; fi

# Expose port
EXPOSE 3001

# Start the application
CMD [ "npm", "start" ]
