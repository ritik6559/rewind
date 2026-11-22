FROM node:26-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash git ripgrep ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.21.0

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/protocol packages/protocol
COPY packages/tools packages/tools
COPY sandbox/sandboxd sandbox/sandboxd
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @rewind/sandboxd...

ENV WORKSPACE_ROOT=/workspace
ENV HOST=0.0.0.0
WORKDIR /workspace
EXPOSE 8080
CMD ["node", "/app/sandbox/sandboxd/src/index.ts"]
