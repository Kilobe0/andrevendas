# Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Runtime
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# imagens das obras versionadas no repo (main.ts serve em /uploads)
COPY --from=build /app/uploads ./uploads
EXPOSE 3001
CMD ["node", "dist/main"]
