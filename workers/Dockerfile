FROM node:26-alpine
RUN apk add --no-cache yarn
COPY package.json yarn.lock global-bundle.pem tsconfig.json instrumentation.ts otel-register.mjs /app/
COPY workers/package.json /app/workers/
COPY ./bin /app/bin
WORKDIR /app
ENV REDISMS_DISABLE_POSTINSTALL=1
RUN --mount=type=secret,id=BULLMQ_PRO_TOKEN \
    BULLMQ_PRO_TOKEN="$(cat /run/secrets/BULLMQ_PRO_TOKEN 2>/dev/null || true)" \
    yarn install --frozen-lockfile --production && rm -f .npmrc
COPY ./workers ./workers
COPY ./app ./app
COPY ./datasets ./datasets
RUN node ./app/adapters.js
EXPOSE 4000
CMD ["yarn", "workers:prod"]
