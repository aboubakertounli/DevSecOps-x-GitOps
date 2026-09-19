FROM cgr.dev/chainguard/node:latest-dev AS deps
WORKDIR /app
USER root
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM cgr.dev/chainguard/node:latest
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps --chown=65532:65532 /app/node_modules ./node_modules
COPY --chown=65532:65532 package.json ./
COPY --chown=65532:65532 src ./src
EXPOSE 8080
CMD ["src/server.js"]
