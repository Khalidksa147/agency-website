# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build \
  && mkdir -p dist/Images dist/videos \
  && if [ -d Images ]; then cp -a Images/. dist/Images/; fi \
  && if [ -d videos ]; then cp -a videos/. dist/videos/; fi

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/dist ./dist
COPY server.mjs ./

EXPOSE 3000
CMD ["node", "server.mjs", "--dist"]
