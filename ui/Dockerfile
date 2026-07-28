# ============================================
# ZOYA UI — Docker Build
# ============================================
# ---- Builder stage ----
FROM oven/bun:latest AS builder
WORKDIR /app
# Copy package files
COPY package.json bun.lock ./
COPY patches/ ./patches/
# Install dependencies
RUN bun install --ignore-scripts
# Copy source
COPY . .
# Build the web renderer
RUN bun run package
# ---- Runtime stage ----
FROM oven/bun:latest AS runtime
WORKDIR /app
# Copy built assets
COPY --from=builder /app/out/renderer ./out/renderer
COPY --from=builder /app/packages/web-host ./packages/web-host
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
# Install production dependencies only
RUN bun install --production --ignore-scripts
# Environment
ENV NODE_ENV=production
ENV AIONUI_PORT=25809
ENV AIONUI_DATA_DIR=/data
ENV AIONUI_LOG_DIR=/logs
ENV AIONUI_STATIC_DIR=/app/out/renderer
# Volumes
VOLUME ["/data", "/logs"]
EXPOSE 25809
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD bun -e "fetch('http://127.0.0.1:25809/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
# Start
CMD ["bun", "scripts/webui.ts", "--no-build", "--skip-backend"]
