// vitest.setup.js
import { validateTestDatabaseTarget } from './src/scripts/staging-database-guard.js';

const defaultTestDb = 'postgresql://testuser:testpass@localhost:5433/testdb?disposable=true';

// Reject unexpected targets rather than silently substituting them:
// Only set defaultTestDb if the environment variable is completely unset.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = defaultTestDb;
}

if (!process.env.STAGING_DATABASE_URL) {
  process.env.STAGING_DATABASE_URL = `${defaultTestDb}&project=xrfnebvkazewqramkpri`;
}

// Strictly validate that test database targets match the expected disposable identity
validateTestDatabaseTarget(process.env.DATABASE_URL, { varName: 'DATABASE_URL' });
validateTestDatabaseTarget(process.env.STAGING_DATABASE_URL, { varName: 'STAGING_DATABASE_URL' });
