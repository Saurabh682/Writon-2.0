export async function appMetaRoutes(fastify, { config, database }) {
  fastify.get('/.well-known/assetlinks.json', async (_request, reply) => {
    reply.header('content-type', 'application/json');
    return [{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.ibitvalley.writon',
        sha256_cert_fingerprints: [
          '2F:C5:3D:AE:26:8C:D2:BE:11:20:00:C1:9E:9A:08:BD:EA:18:A0:D1:6F:0D:CC:CE:F1:C6:0F:86:F8:84:45:7D',
        ],
      },
    }];
  });

  fastify.get('/api/v1/app/version', async () => ({
    latestVersionCode: config.latestAppVersionCode ?? 112,
    minSupportedVersionCode: config.minSupportedAppVersionCode ?? 101,
    updateUrl: config.playStoreAppUrl ?? 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
  }));

  fastify.get('/health', async () => {
    const result = await database.query('select now() as database_time');

    return {
      status: 'ok',
      database: 'connected',
      databaseTime: result.rows[0].database_time,
    };
  });
}
