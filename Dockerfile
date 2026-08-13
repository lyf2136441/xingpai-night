FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY index.html client.mjs server.js three.module.js content-db.json ./
COPY assets ./assets

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

USER node
CMD ["node", "server.js"]
