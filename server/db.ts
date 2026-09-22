import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

const { Pool } = pg;

export interface DBResult<T = any> {
  rows: T[];
  rowCount?: number;
}

interface DBClient {
  query<T = any>(sql: string, params?: any[]): Promise<DBResult<T>>;
}

let dbInstance: DBClient | null = null;

export async function getDB(): Promise<DBClient> {
  if (dbInstance) return dbInstance;

  // 1. Check if external PostgreSQL connection is configured
  const connectionString = process.env.DATABASE_URL;
  const sqlHost = process.env.SQL_HOST;

  if (connectionString || sqlHost) {
    try {
      console.log('Connecting to PostgreSQL via pg.Pool...');
      const pool = connectionString
        ? new Pool({ connectionString })
        : new Pool({
            host: process.env.SQL_HOST,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_DB_NAME,
            max: 10,
            connectionTimeoutMillis: 10000,
          });

      // Test connection
      await pool.query('SELECT 1');
      console.log('Successfully connected to external PostgreSQL pool');

      dbInstance = {
        async query<T = any>(sql: string, params?: any[]): Promise<DBResult<T>> {
          const res = await pool.query(sql, params);
          return { rows: res.rows as T[], rowCount: res.rowCount ?? undefined };
        },
      };
      await initSchema(dbInstance);
      return dbInstance;
    } catch (err) {
      console.warn('Could not connect to external PostgreSQL, falling back to embedded PGlite:', err);
    }
  }

  // 2. Embedded persistent PostgreSQL via PGlite
  const dataDir = path.resolve(process.cwd(), 'data', 'pgdata');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log(`Initializing embedded PostgreSQL (PGlite) at ${dataDir}...`);
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  console.log('Embedded PostgreSQL (PGlite) is ready');

  dbInstance = {
    async query<T = any>(sql: string, params?: any[]): Promise<DBResult<T>> {
      const res = await pglite.query(sql, params);
      return { rows: (res.rows as T[]) || [], rowCount: res.rows?.length || 0 };
    },
  };

  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db: DBClient) {
  console.log('Verifying PostgreSQL schema for Pixelytics...');

  // Users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'analyst',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Datasets table
  await db.query(`
    CREATE TABLE IF NOT EXISTS datasets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      filename VARCHAR(255),
      description TEXT,
      row_count INTEGER DEFAULT 0,
      column_count INTEGER DEFAULT 0,
      columns_meta JSONB NOT NULL DEFAULT '[]',
      raw_data JSONB NOT NULL DEFAULT '[]',
      current_data JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ETL pipeline steps table
  await db.query(`
    CREATE TABLE IF NOT EXISTS etl_steps (
      id SERIAL PRIMARY KEY,
      dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      action_type VARCHAR(100) NOT NULL,
      details_json JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Trained ML models table
  await db.query(`
    CREATE TABLE IF NOT EXISTS ml_models (
      id SERIAL PRIMARY KEY,
      dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      model_name VARCHAR(255) NOT NULL,
      algorithm VARCHAR(100) NOT NULL,
      task_type VARCHAR(50) NOT NULL,
      target_column VARCHAR(255),
      feature_columns JSONB NOT NULL DEFAULT '[]',
      hyperparameters JSONB NOT NULL DEFAULT '{}',
      metrics JSONB NOT NULL DEFAULT '{}',
      model_state JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Inference prediction logs table
  await db.query(`
    CREATE TABLE IF NOT EXISTS prediction_logs (
      id SERIAL PRIMARY KEY,
      model_id INTEGER REFERENCES ml_models(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      input_features JSONB NOT NULL,
      prediction_result JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('PostgreSQL schema initialized successfully.');
}
