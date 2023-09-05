FROM node:19-alpine

COPY package*.json /app/

WORKDIR /app

RUN npm install

COPY src /app/
COPY tsconfig.json /app/

RUN npm run build

WORKDIR /app/dist

CMD ["node", "server.js"]