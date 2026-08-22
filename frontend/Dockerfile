FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run the dev server. Note: host binding is important for Docker
CMD ["npm", "run", "dev", "--", "--host"]
