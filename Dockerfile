FROM node:20-slim

WORKDIR /app

# Copy everything up front (small project — simplicity over layer-cache
# optimization). npm ci triggers the postinstall "prisma generate" hook,
# which needs prisma/schema.prisma to already be present.
COPY . .

RUN npm ci
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "start"]
