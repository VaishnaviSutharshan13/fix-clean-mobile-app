FROM node:22-alpine

WORKDIR /app/backend

# Copy backend package manifests and yarn lock
COPY backend/package.json backend/yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy backend source code and tsconfigs
COPY backend/ ./

# Build and compile TypeScript NestJS application
RUN yarn build

# Expose default port
EXPOSE 10000

ENV PORT=10000
ENV NODE_ENV=production

CMD ["yarn", "start:prod"]
