import { Router, Response } from 'express';
import { getDB } from '../db.ts';
import { optionalAuth, AuthenticatedRequest } from '../middleware/jwt.ts';
import { computeCorrelationMatrix, ColumnMeta } from '../ml-engine.ts';

const router = Router();

router.get('/:datasetId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { datasetId } = req.params;
    const db = await getDB();
    const datasetRes = await db.query('SELECT * FROM datasets WHERE id = $1', [datasetId]);

    if (datasetRes.rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const dataset = datasetRes.rows[0];
    const data =
      typeof dataset.current_data === 'string' ? JSON.parse(dataset.current_data) : dataset.current_data;
    const columnsMeta: ColumnMeta[] =
      typeof dataset.columns_meta === 'string' ? JSON.parse(dataset.columns_meta) : dataset.columns_meta;

    const numericCols = columnsMeta.filter((c) => c.type === 'numeric').map((c) => c.name);
    const correlation = computeCorrelationMatrix(data, numericCols);

    // Identify notable correlations
    const strongCorrelations: { featureA: string; featureB: string; correlation: number; relationship: string }[] = [];
    const matrix = correlation.matrix;
    const features = correlation.features;

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const r = matrix[i][j];
        if (Math.abs(r) >= 0.35) {
          strongCorrelations.push({
            featureA: features[i],
            featureB: features[j],
            correlation: r,
            relationship: r > 0 ? 'Strong Positive' : 'Strong Inverse/Negative',
          });
        }
      }
    }

    strongCorrelations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    // Automated insights list
    const insights: string[] = [];

    if (data.length > 0) {
      insights.push(`Analyzed ${data.length.toLocaleString()} instances across ${columnsMeta.length} features.`);
    }

    const missingCols = columnsMeta.filter((c) => c.missingCount > 0);
    if (missingCols.length > 0) {
      const topMissing = missingCols.sort((a, b) => b.missingPercentage - a.missingPercentage)[0];
      insights.push(
        `${missingCols.length} features contain null values. Highest missing rate is in '${topMissing.name}' (${topMissing.missingPercentage}% missing). Imputation recommended via ETL Studio.`
      );
    } else {
      insights.push('Zero missing values detected across the entire active dataset. Dataset is fully clean.');
    }

    if (strongCorrelations.length > 0) {
      const topCorr = strongCorrelations[0];
      insights.push(
        `Highest correlation found between '${topCorr.featureA}' and '${topCorr.featureB}' (r = ${topCorr.correlation}). These features share high mutual predictive power.`
      );
    }

    const categoricalCols = columnsMeta.filter((c) => c.type === 'categorical');
    if (categoricalCols.length > 0) {
      insights.push(
        `Found ${categoricalCols.length} categorical features ([${categoricalCols.map((c) => c.name).slice(0, 3).join(', ')}]). Ready for One-Hot or Label encoding.`
      );
    }

    // High cardinality check
    const highCardinality = categoricalCols.filter((c) => c.uniqueCount > 25);
    if (highCardinality.length > 0) {
      insights.push(
        `High cardinality in '${highCardinality[0].name}' (${highCardinality[0].uniqueCount} unique categories). Consider grouping rare categories or dropping identifier columns.`
      );
    }

    return res.json({
      datasetId,
      name: dataset.name,
      rowCount: data.length,
      columnCount: columnsMeta.length,
      correlation,
      strongCorrelations: strongCorrelations.slice(0, 10),
      automatedInsights: insights,
      columnsMeta,
    });
  } catch (err: any) {
    console.error('Fetch insights error:', err);
    return res.status(500).json({ error: 'Failed to generate automated insights' });
  }
});

export default router;
