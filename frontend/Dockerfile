# Development-only image used by docker-compose. Render deploys the frontend
# as a static site instead (see README.md "Deployment") — `npm run build`
# output is served directly, no Docker/Node process needed in production.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
