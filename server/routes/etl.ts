import { Router, Response } from 'express';
import { getDB } from '../db.ts';
import { optionalAuth, AuthenticatedRequest } from '../middleware/jwt.ts';
import { executeETL, analyzeDataset, ETLConfig } from '../ml-engine.ts';

const router = Router();

// Apply transformation to dataset
router.post('/transform', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { datasetId, action, columns, strategy, constantValue, threshold } = req.body;

    if (!datasetId || !action) {
      return res.status(400).json({ error: 'datasetId and action are required' });
    }

    const db = await getDB();
    const datasetRes = await db.query('SELECT * FROM datasets WHERE id = $1', [datasetId]);
    if (datasetRes.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const dataset = datasetRes.rows[0];
    const currentData =
      typeof dataset.current_data === 'string' ? JSON.parse(dataset.current_data) : dataset.current_data;

    const etlConfig: ETLConfig = {
      action,
      columns,
      strategy,
      constantValue,
      threshold,
    };

    const { processedData, summary } = executeETL(currentData, etlConfig);
    const newColumnsMeta = analyzeDataset(processedData);

    // Save step to etl_steps table
    const stepsCountRes = await db.query(
      'SELECT COUNT(*) as count FROM etl_steps WHERE dataset_id = $1',
      [datasetId]
    );
    const stepNumber = parseInt(stepsCountRes.rows[0]?.count || '0', 10) + 1;

    await db.query(
      `INSERT INTO etl_steps (dataset_id, step_number, action_type, details_json)
       VALUES ($1, $2, $3, $4)`,
      [
        datasetId,
        stepNumber,
        action,
        JSON.stringify({ config: etlConfig, summary, timestamp: new Date().toISOString() }),
      ]
    );

    // Update dataset in PostgreSQL
    await db.query(
      `UPDATE datasets
       SET current_data = $1,
           columns_meta = $2,
           row_count = $3,
           column_count = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        JSON.stringify(processedData),
        JSON.stringify(newColumnsMeta),
        processedData.length,
        newColumnsMeta.length,
        datasetId,
      ]
    );

    return res.json({
      message: 'Transformation applied successfully',
      summary,
      stepNumber,
      rowCount: processedData.length,
      columnCount: newColumnsMeta.length,
      columnsMeta: newColumnsMeta,
      preview: processedData.slice(0, 20),
    });
  } catch (err: any) {
    console.error('ETL transformation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to apply transformation' });
  }
});

// Get transformation pipeline history
router.get('/history/:datasetId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { datasetId } = req.params;
    const db = await getDB();
    const result = await db.query(
      `SELECT id, step_number, action_type, details_json, created_at
       FROM etl_steps
       WHERE dataset_id = $1
       ORDER BY step_number ASC`,
      [datasetId]
    );

    const steps = result.rows.map((row) => ({
      id: row.id,
      stepNumber: row.step_number,
      actionType: row.action_type,
      details: typeof row.details_json === 'string' ? JSON.parse(row.details_json) : row.details_json,
      createdAt: row.created_at,
    }));

    return res.json(steps);
  } catch (err: any) {
    console.error('ETL history error:', err);
    return res.status(500).json({ error: 'Failed to fetch ETL history' });
  }
});

// Reset dataset to raw data
router.post('/reset/:datasetId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { datasetId } = req.params;
    const db = await getDB();
    const datasetRes = await db.query('SELECT raw_data FROM datasets WHERE id = $1', [datasetId]);

    if (datasetRes.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const rawData =
      typeof datasetRes.rows[0].raw_data === 'string'
        ? JSON.parse(datasetRes.rows[0].raw_data)
        : datasetRes.rows[0].raw_data;

    const columnsMeta = analyzeDataset(rawData);

    // Reset current_data to raw_data
    await db.query(
      `UPDATE datasets
       SET current_data = raw_data,
           columns_meta = $1,
           row_count = $2,
           column_count = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [JSON.stringify(columnsMeta), rawData.length, columnsMeta.length, datasetId]
    );

    // Clear ETL steps
    await db.query('DELETE FROM etl_steps WHERE dataset_id = $1', [datasetId]);

    return res.json({
      message: 'Dataset restored to original raw state',
      rowCount: rawData.length,
      columnCount: columnsMeta.length,
      columnsMeta,
    });
  } catch (err: any) {
    console.error('ETL reset error:', err);
    return res.status(500).json({ error: 'Failed to reset dataset' });
  }
});

export default router;
