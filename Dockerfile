FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY .env .           
RUN npm install

# Copy the full source
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port and start app
EXPOSE 3000
CMD ["npm", "start"]
