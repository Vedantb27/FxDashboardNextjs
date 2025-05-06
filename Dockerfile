# Stage 1: Build the application
FROM node:18 AS builder

WORKDIR /app

# Copy dependency files and install
COPY package*.json ./
COPY tsconfig.json ./
COPY public ./public
COPY src ./src
COPY .env.production ./

# Optional: Copy next.config.js if it exists (comment out if not needed)
# COPY next.config.js ./

RUN npm install
RUN npm run build

# Stage 2: Run the production app
FROM node:18 AS runner

WORKDIR /app

# Copy production-ready files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Optional: COPY next.config.js if used at runtime
# COPY --from=builder /app/next.config.js ./

# Expose the Next.js default port
EXPOSE 3000

# Start the production server
CMD ["npm", "start"]
