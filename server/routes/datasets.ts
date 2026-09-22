import { Router, Response } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { getDB } from '../db.ts';
import { optionalAuth, AuthenticatedRequest } from '../middleware/jwt.ts';
import { analyzeDataset } from '../ml-engine.ts';
import { getSampleDatasets } from '../sample-datasets.ts';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Helper to seed sample datasets if database is empty
export async function ensureDefaultDatasets() {
  const db = await getDB();
  const res = await db.query('SELECT COUNT(*) as count FROM datasets');
  const count = parseInt(res.rows[0]?.count || '0', 10);

  if (count === 0) {
    console.log('Seeding initial curated datasets into PostgreSQL...');
    const samples = getSampleDatasets();
    for (const sample of samples) {
      const columnsMeta = analyzeDataset(sample.data);
      await db.query(
        `INSERT INTO datasets (name, filename, description, row_count, column_count, columns_meta, raw_data, current_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          sample.name,
          sample.filename,
          sample.description,
          sample.data.length,
          columnsMeta.length,
          JSON.stringify(columnsMeta),
          JSON.stringify(sample.data),
          JSON.stringify(sample.data),
        ]
      );
    }
    console.log('Seeded sample datasets successfully.');
  }
}

// 1. List all datasets
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureDefaultDatasets();
    const db = await getDB();
    const result = await db.query(`
      SELECT id, name, filename, description, row_count, column_count, created_at, updated_at
      FROM datasets
      ORDER BY updated_at DESC, id DESC
    `);
    return res.json(result.rows);
  } catch (err: any) {
    console.error('List datasets error:', err);
    return res.status(500).json({ error: 'Failed to fetch datasets' });
  }
});

// 2. Get dataset details & features
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDB();
    const result = await db.query('SELECT * FROM datasets WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const row = result.rows[0];
    const rawData = typeof row.current_data === 'string' ? JSON.parse(row.current_data) : row.current_data;
    const columnsMeta = typeof row.columns_meta === 'string' ? JSON.parse(row.columns_meta) : row.columns_meta;

    return res.json({
      id: row.id,
      name: row.name,
      filename: row.filename,
      description: row.description,
      rowCount: row.row_count,
      columnCount: row.column_count,
      columnsMeta,
      preview: rawData.slice(0, 50),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err: any) {
    console.error('Get dataset error:', err);
    return res.status(500).json({ error: 'Failed to fetch dataset' });
  }
});

// 3. Get paginated instances
router.get('/:id/instances', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit as string || '20', 10)));
    const search = (req.query.search as string || '').toLowerCase().trim();

    const db = await getDB();
    const result = await db.query('SELECT current_data FROM datasets WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    let data: Record<string, any>[] =
      typeof result.rows[0].current_data === 'string'
        ? JSON.parse(result.rows[0].current_data)
        : result.rows[0].current_data;

    if (search) {
      data = data.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(search))
      );
    }

    const totalInstances = data.length;
    const totalPages = Math.ceil(totalInstances / limit) || 1;
    const offset = (page - 1) * limit;
    const rows = data.slice(offset, offset + limit);

    return res.json({
      instances: rows,
      pagination: {
        page,
        limit,
        totalInstances,
        totalPages,
      },
    });
  } catch (err: any) {
    console.error('Get instances error:', err);
    return res.status(500).json({ error: 'Failed to fetch instances' });
  }
});

// 4. Upload dataset (CSV, JSON)
router.post('/upload', optionalAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const name = req.body.name || req.file?.originalname?.replace(/\.[^/.]+$/, '') || 'Untitled Dataset';
    const description = req.body.description || 'Custom uploaded dataset';
    let data: Record<string, any>[] = [];
    let filename = req.file?.originalname || 'dataset.json';

    if (req.file) {
      const fileContent = req.file.buffer.toString('utf-8');
      if (req.file.originalname.endsWith('.json')) {
        data = JSON.parse(fileContent);
      } else {
        // Parse CSV
        const parsed = Papa.parse(fileContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        data = parsed.data as Record<string, any>[];
      }
    } else if (req.body.jsonData) {
      data = typeof req.body.jsonData === 'string' ? JSON.parse(req.body.jsonData) : req.body.jsonData;
      filename = req.body.filename || 'uploaded.json';
    } else {
      return res.status(400).json({ error: 'No file or data provided for upload' });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Uploaded dataset must contain a non-empty array of records' });
    }

    const columnsMeta = analyzeDataset(data);
    const userId = req.user?.userId || null;

    const db = await getDB();
    const insertRes = await db.query(
      `INSERT INTO datasets (user_id, name, filename, description, row_count, column_count, columns_meta, raw_data, current_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, filename, description, row_count, column_count, created_at`,
      [
        userId,
        name,
        filename,
        description,
        data.length,
        columnsMeta.length,
        JSON.stringify(columnsMeta),
        JSON.stringify(data),
        JSON.stringify(data),
      ]
    );

    return res.status(201).json({
      message: 'Dataset uploaded and analyzed successfully',
      dataset: insertRes.rows[0],
    });
  } catch (err: any) {
    console.error('Dataset upload error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process dataset upload' });
  }
});

// 5. Delete dataset
router.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDB();
    await db.query('DELETE FROM datasets WHERE id = $1', [id]);
    return res.json({ message: 'Dataset deleted successfully' });
  } catch (err: any) {
    console.error('Delete dataset error:', err);
    return res.status(500).json({ error: 'Failed to delete dataset' });
  }
});

export default router;
