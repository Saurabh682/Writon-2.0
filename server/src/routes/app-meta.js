export async function appMetaRoutes(fastify, { config, database }) {
  fastify.get('/api/v1/app/version', async () => ({
    latestVersionCode: config.latestAppVersionCode ?? 108,
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
