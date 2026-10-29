# JavaScript-only overlay built with the repository's existing lockfile.
# Keep Linux native dependencies from the pinned official image.
ARG BASE_IMAGE=ghcr.io/karakeep-app/karakeep@sha256:994b1f6cc9b900805431bd05069e5e936ddde034272ae273311349bb175daf8d
FROM ${BASE_IMAGE}
USER root
RUN rm -rf /app/apps/web/.next /app/apps/workers/dist
COPY --chown=node:node web-next/ /app/apps/web/.next/
COPY --chown=node:node web-server.js /app/apps/web/server.js
COPY --chown=node:node worker-dist/ /app/apps/workers/dist/
ENV SERVER_VERSION=2026.10.30-keeply-ui
LABEL org.opencontainers.image.title="Keeply · 收好"
