import { Router, Response } from 'express';
import { getDB } from '../db.ts';
import { optionalAuth, AuthenticatedRequest } from '../middleware/jwt.ts';
import { trainMLModel, predictInference } from '../ml-engine.ts';

const router = Router();

// Train a new ML model
router.post('/train', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { datasetId, modelName, taskType, algorithm, targetColumn, featureColumns, hyperparameters } = req.body;

    if (!datasetId || !taskType || !algorithm || !featureColumns || featureColumns.length === 0) {
      return res.status(400).json({ error: 'Missing required training parameters' });
    }

    const db = await getDB();
    const datasetRes = await db.query('SELECT current_data FROM datasets WHERE id = $1', [datasetId]);
    if (datasetRes.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const data =
      typeof datasetRes.rows[0].current_data === 'string'
        ? JSON.parse(datasetRes.rows[0].current_data)
        : datasetRes.rows[0].current_data;

    console.log(`Training ${taskType} model '${modelName || algorithm}' on dataset ${datasetId}...`);
    const trainResult = trainMLModel({
      data,
      taskType,
      algorithm,
      targetColumn,
      featureColumns,
      hyperparameters,
    });

    const userId = req.user?.userId || null;
    const finalModelName = modelName || `${algorithm.replace(/_/g, ' ')} (${targetColumn || 'Cluster'})`;

    const insertRes = await db.query(
      `INSERT INTO ml_models (dataset_id, user_id, model_name, algorithm, task_type, target_column, feature_columns, hyperparameters, metrics, model_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, model_name, algorithm, task_type, target_column, feature_columns, metrics, created_at`,
      [
        datasetId,
        userId,
        finalModelName,
        algorithm,
        taskType,
        targetColumn || null,
        JSON.stringify(featureColumns),
        JSON.stringify(hyperparameters || {}),
        JSON.stringify(trainResult.metrics),
        JSON.stringify(trainResult.modelState),
      ]
    );

    const savedModel = insertRes.rows[0];
    return res.status(201).json({
      message: 'Model trained and saved successfully',
      model: {
        id: savedModel.id,
        modelName: savedModel.model_name,
        algorithm: savedModel.algorithm,
        taskType: savedModel.task_type,
        targetColumn: savedModel.target_column,
        featureColumns: typeof savedModel.feature_columns === 'string' ? JSON.parse(savedModel.feature_columns) : savedModel.feature_columns,
        metrics: typeof savedModel.metrics === 'string' ? JSON.parse(savedModel.metrics) : savedModel.metrics,
        createdAt: savedModel.created_at,
      },
    });
  } catch (err: any) {
    console.error('Model training error:', err);
    return res.status(500).json({ error: err.message || 'Failed to train machine learning model' });
  }
});

// List trained models for dataset
router.get('/models/:datasetId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { datasetId } = req.params;
    const db = await getDB();
    const result = await db.query(
      `SELECT id, model_name, algorithm, task_type, target_column, feature_columns, hyperparameters, metrics, created_at
       FROM ml_models
       WHERE dataset_id = $1
       ORDER BY created_at DESC`,
      [datasetId]
    );

    const models = result.rows.map((row) => ({
      id: row.id,
      modelName: row.model_name,
      algorithm: row.algorithm,
      taskType: row.task_type,
      targetColumn: row.target_column,
      featureColumns: typeof row.feature_columns === 'string' ? JSON.parse(row.feature_columns) : row.feature_columns,
      hyperparameters: typeof row.hyperparameters === 'string' ? JSON.parse(row.hyperparameters) : row.hyperparameters,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
      createdAt: row.created_at,
    }));

    return res.json(models);
  } catch (err: any) {
    console.error('Fetch models error:', err);
    return res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Real-time inference prediction
router.post('/predict', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { modelId, inputs } = req.body;

    if (!modelId || !inputs) {
      return res.status(400).json({ error: 'modelId and feature inputs are required' });
    }

    const db = await getDB();
    const modelRes = await db.query('SELECT * FROM ml_models WHERE id = $1', [modelId]);

    if (modelRes.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const modelRow = modelRes.rows[0];
    const featureColumns =
      typeof modelRow.feature_columns === 'string' ? JSON.parse(modelRow.feature_columns) : modelRow.feature_columns;
    const modelState =
      typeof modelRow.model_state === 'string' ? JSON.parse(modelRow.model_state) : modelRow.model_state;

    const predictionOutput = predictInference(
      {
        task_type: modelRow.task_type,
        feature_columns: featureColumns,
        model_state: modelState,
        target_column: modelRow.target_column,
      },
      inputs
    );

    const userId = req.user?.userId || null;

    // Log prediction to database
    await db.query(
      `INSERT INTO prediction_logs (model_id, user_id, input_features, prediction_result)
       VALUES ($1, $2, $3, $4)`,
      [modelId, userId, JSON.stringify(inputs), JSON.stringify(predictionOutput)]
    );

    return res.json({
      modelId,
      modelName: modelRow.model_name,
      targetColumn: modelRow.target_column,
      inputs,
      result: predictionOutput,
    });
  } catch (err: any) {
    console.error('Inference prediction error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate prediction' });
  }
});

// Fetch prediction logs for model
router.get('/logs/:modelId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { modelId } = req.params;
    const db = await getDB();
    const result = await db.query(
      `SELECT id, input_features, prediction_result, created_at
       FROM prediction_logs
       WHERE model_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [modelId]
    );

    const logs = result.rows.map((row) => ({
      id: row.id,
      inputs: typeof row.input_features === 'string' ? JSON.parse(row.input_features) : row.input_features,
      result: typeof row.prediction_result === 'string' ? JSON.parse(row.prediction_result) : row.prediction_result,
      createdAt: row.created_at,
    }));

    return res.json(logs);
  } catch (err: any) {
    console.error('Fetch logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch prediction logs' });
  }
});

export default router;
