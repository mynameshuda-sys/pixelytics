import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDB } from './server/db.ts';
import { ensureDefaultDatasets } from './server/routes/datasets.ts';
import authRouter from './server/routes/auth.ts';
import datasetsRouter from './server/routes/datasets.ts';
import etlRouter from './server/routes/etl.ts';
import mlRouter from './server/routes/ml.ts';
import insightsRouter from './server/routes/insights.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize PostgreSQL database
  try {
    console.log('Bootstrapping Pixelytics PostgreSQL database...');
    await getDB();
    await ensureDefaultDatasets();
  } catch (err) {
    console.error('Failed to initialize database on startup:', err);
  }

  // Health check
  app.get('/api/health', async (req, res) => {
    try {
      const db = await getDB();
      const dbRes = await db.query('SELECT 1 as alive');
      res.json({
        status: 'healthy',
        app: 'Pixelytics',
        version: '1.0.0',
        database: 'PostgreSQL',
        dbStatus: dbRes.rows[0]?.alive === 1 ? 'connected' : 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'degraded', error: err.message });
    }
  });

  // Mount API routers
  app.use('/api/auth', authRouter);
  app.use('/api/datasets', datasetsRouter);
  app.use('/api/etl', etlRouter);
  app.use('/api/ml', mlRouter);
  app.use('/api/insights', insightsRouter);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pixelytics server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting Pixelytics server:', err);
  process.exit(1);
});
