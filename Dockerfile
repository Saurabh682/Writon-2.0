FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy server package definitions
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy server source code
COPY server/src ./src

RUN addgroup -S writon && adduser -S writon -G writon && chown -R writon:writon /app
USER writon

EXPOSE 3001
CMD ["node", "src/server.js"]
