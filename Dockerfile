FROM node:20-alpine

RUN mkdir -p /app
WORKDIR /app

COPY package*.json ./
COPY .env .              
RUN npm install

COPY . .                  

EXPOSE 3000
CMD ["npm", "start"]
