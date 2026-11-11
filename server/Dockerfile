FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations
USER node
EXPOSE 3001
CMD ["sh", "-c", "node scripts/migrate.js && exec node src/index.js"]
