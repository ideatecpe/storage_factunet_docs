FROM node:20-alpine

WORKDIR /app

# Instala dependencias primero (mejor cache)
COPY package*.json ./
RUN npm install --production

# Copia el código fuente
COPY src/ ./src/

EXPOSE 3003

CMD ["node", "src/index.js"]
