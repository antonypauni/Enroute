FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 ENROUTE_DATA=/data/data.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3001
CMD ["node","server/index.js"]
