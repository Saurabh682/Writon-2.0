FROM asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api@sha256:776b3db7eafcd0531eebcc456f1844ad3089431442de1f28985b202d8651580c AS patcher
USER root
COPY apply-form-aware.mjs /tmp/apply-form-aware.mjs
RUN node /tmp/apply-form-aware.mjs

FROM asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api@sha256:776b3db7eafcd0531eebcc456f1844ad3089431442de1f28985b202d8651580c
COPY --from=patcher --chown=writon:writon /app/src/server.js /app/src/server.js
