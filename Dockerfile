FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built UI
COPY --from=builder /app/dist ./dist

# Copy source for CLI and gateway
COPY --from=builder /app/gateway ./gateway
COPY --from=builder /app/cli ./cli
COPY --from=builder /app/research ./research
COPY --from=builder /app/skills ./skills
COPY --from=builder /app/AGENTS.md ./AGENTS.md
COPY --from=builder /app/SOUL.md ./SOUL.md
COPY --from=builder /app/research.md ./research.md

# Install tsx for TypeScript execution
RUN npm install -g tsx serve

# Create workspace directory
RUN mkdir -p /root/.openseabri/workspace

EXPOSE 3000 18790

# Start both the web server and the gateway
CMD ["sh", "-c", "serve -s dist -l 3000 & tsx gateway/index.ts"]
