FROM asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api@sha256:de399cf3ece5fef1e2579d1192fb3c6ccb06de73b3adc868c09240f1d7c1f77f AS patcher
USER root
RUN apk add --no-cache patch
COPY server-r2.patch /tmp/server-r2.patch
RUN cd /app && patch --batch --forward -p1 < /tmp/server-r2.patch

FROM asia-south1-docker.pkg.dev/writon-app-2020/writon/writon-api@sha256:de399cf3ece5fef1e2579d1192fb3c6ccb06de73b3adc868c09240f1d7c1f77f
COPY --from=patcher --chown=writon:writon /app/src/server.js /app/src/server.js
