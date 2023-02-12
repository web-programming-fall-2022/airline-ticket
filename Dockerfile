FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN chmod +x entrypoint.sh
EXPOSE 3000
CMD [ "./entrypoint.sh" ]
