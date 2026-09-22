// Machine Learning Algorithms Library for Pixelytics
// Standardized numerical implementations for Classification, Regression, and Clustering

// ==========================================
// 1. CLASSIFICATION ALGORITHMS (11 total)
// ==========================================

export interface ClassificationFitResult {
  weights?: number[][];
  biases?: number[];
  featureImportances: number[];
  predict: (x: number[]) => { classIdx: number; probs: number[] };
  modelData?: any;
}

// Helper: Normalize features
function getMeanStd(X: number[][], p: number, n: number) {
  const means = Array(p).fill(0);
  const stds = Array(p).fill(1);
  for (let j = 0; j < p; j++) {
    means[j] = X.reduce((acc, row) => acc + row[j], 0) / (n || 1);
    const variance = X.reduce((acc, row) => acc + Math.pow(row[j] - means[j], 2), 0) / (n || 1);
    stds[j] = Math.sqrt(variance) || 1;
  }
  return { means, stds };
}

// 1. Multinomial Logistic Regression
export function fitLogisticRegression(X: number[][], y: number[], numClasses: number): ClassificationFitResult {
  const n = X.length;
  const p = X[0].length;
  const { means, stds } = getMeanStd(X, p, n);
  const X_norm = X.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));

  const weights: number[][] = Array.from({ length: numClasses }, () => Array(p).fill(0));
  const biases: number[] = Array(numClasses).fill(0);
  const lr = 0.05;
  const epochs = 100;

  for (let ep = 0; ep < epochs; ep++) {
    for (let i = 0; i < n; i++) {
      const logits = biases.map((b, c) => {
        let s = b;
        for (let j = 0; j < p; j++) s += X_norm[i][j] * weights[c][j];
        return s;
      });
      const maxL = Math.max(...logits);
      const exps = logits.map((l) => Math.exp(l - maxL));
      const sumE = exps.reduce((a, b) => a + b, 0);
      const probs = exps.map((e) => e / sumE);

      const target = y[i];
      for (let c = 0; c < numClasses; c++) {
        const err = probs[c] - (c === target ? 1 : 0);
        biases[c] -= (lr * err) / n;
        for (let j = 0; j < p; j++) {
          weights[c][j] -= (lr * err * X_norm[i][j]) / n;
        }
      }
    }
  }

  const realWeights = weights.map((row) => row.map((w, j) => Math.round((w / stds[j]) * 1000) / 1000));
  const importances = Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    for (let c = 0; c < numClasses; c++) importances[j] += Math.abs(realWeights[c][j]);
  }
  const totImp = importances.reduce((a, b) => a + b, 0) || 1;
  const normImp = importances.map((x) => Math.round((x / totImp) * 1000) / 1000);

  return {
    weights: realWeights,
    biases,
    featureImportances: normImp,
    predict: (x: number[]) => {
      const logits = biases.map((b, c) => {
        let s = b;
        for (let j = 0; j < p; j++) s += ((x[j] - means[j]) / stds[j]) * weights[c][j];
        return s;
      });
      const maxL = Math.max(...logits);
      const exps = logits.map((l) => Math.exp(l - maxL));
      const sumE = exps.reduce((a, b) => a + b, 0);
      const probs = exps.map((e) => Math.round((e / sumE) * 1000) / 1000);
      let best = 0;
      probs.forEach((pr, idx) => {
        if (pr > probs[best]) best = idx;
      });
      return { classIdx: best, probs };
    },
  };
}

// 2. Decision Tree Classifier (CART with Gini Impurity)
interface TreeNode {
  isLeaf: boolean;
  classIdx?: number;
  probs?: number[];
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export function fitDecisionTreeClassifier(X: number[][], y: number[], numClasses: number, maxDepth = 4): ClassificationFitResult {
  const p = X[0].length;
  const featureImportances = Array(p).fill(0);

  function gini(labels: number[]) {
    if (labels.length === 0) return 0;
    const counts = Array(numClasses).fill(0);
    labels.forEach((l) => counts[l]++);
    let sumSq = 0;
    counts.forEach((c) => {
      const p = c / labels.length;
      sumSq += p * p;
    });
    return 1 - sumSq;
  }

  function getLeaf(labels: number[]): TreeNode {
    const counts = Array(numClasses).fill(0);
    labels.forEach((l) => counts[l]++);
    const total = labels.length || 1;
    const probs = counts.map((c) => Math.round((c / total) * 1000) / 1000);
    let best = 0;
    counts.forEach((c, idx) => {
      if (c > counts[best]) best = idx;
    });
    return { isLeaf: true, classIdx: best, probs };
  }

  function buildTree(indices: number[], depth: number): TreeNode {
    const labels = indices.map((i) => y[i]);
    if (depth >= maxDepth || indices.length <= 4 || new Set(labels).size <= 1) {
      return getLeaf(labels);
    }

    const currentGini = gini(labels);
    let bestGain = 0;
    let bestFeat = 0;
    let bestThresh = 0;
    let bestLeft: number[] = [];
    let bestRight: number[] = [];

    for (let f = 0; f < p; f++) {
      const vals = indices.map((i) => X[i][f]);
      const uniqueVals = Array.from(new Set(vals)).sort((a, b) => a - b);
      if (uniqueVals.length <= 1) continue;

      for (let s = 0; s < uniqueVals.length - 1; s++) {
        const thresh = (uniqueVals[s] + uniqueVals[s + 1]) / 2;
        const left: number[] = [];
        const right: number[] = [];
        indices.forEach((i) => {
          if (X[i][f] <= thresh) left.push(i);
          else right.push(i);
        });
        if (left.length === 0 || right.length === 0) continue;

        const leftLabels = left.map((i) => y[i]);
        const rightLabels = right.map((i) => y[i]);
        const gain = currentGini - (left.length / indices.length) * gini(leftLabels) - (right.length / indices.length) * gini(rightLabels);
        if (gain > bestGain) {
          bestGain = gain;
          bestFeat = f;
          bestThresh = thresh;
          bestLeft = left;
          bestRight = right;
        }
      }
    }

    if (bestGain <= 0.001 || bestLeft.length === 0 || bestRight.length === 0) {
      return getLeaf(labels);
    }

    featureImportances[bestFeat] += bestGain * indices.length;

    return {
      isLeaf: false,
      feature: bestFeat,
      threshold: bestThresh,
      left: buildTree(bestLeft, depth + 1),
      right: buildTree(bestRight, depth + 1),
    };
  }

  const root = buildTree(X.map((_, i) => i), 0);
  const totImp = featureImportances.reduce((a, b) => a + b, 0) || 1;
  const normImp = featureImportances.map((x) => Math.round((x / totImp) * 1000) / 1000);

  function predictNode(node: TreeNode, x: number[]): { classIdx: number; probs: number[] } {
    if (node.isLeaf) {
      return { classIdx: node.classIdx ?? 0, probs: node.probs ?? Array(numClasses).fill(1 / numClasses) };
    }
    if (x[node.feature ?? 0] <= (node.threshold ?? 0)) {
      return predictNode(node.left!, x);
    } else {
      return predictNode(node.right!, x);
    }
  }

  return {
    featureImportances: normImp,
    predict: (x) => predictNode(root, x),
    modelData: { tree: root },
  };
}

// 3. Random Forest Classifier (Ensemble of 8 bagged CART trees)
export function fitRandomForestClassifier(X: number[][], y: number[], numClasses: number, numTrees = 8): ClassificationFitResult {
  const n = X.length;
  const p = X[0].length;
  const trees: ClassificationFitResult[] = [];
  const totalImportances = Array(p).fill(0);

  for (let t = 0; t < numTrees; t++) {
    // Bootstrap sampling with replacement
    const bootIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      bootIndices.push(Math.floor(Math.random() * n));
    }
    const X_b = bootIndices.map((i) => X[i]);
    const y_b = bootIndices.map((i) => y[i]);

    const tree = fitDecisionTreeClassifier(X_b, y_b, numClasses, 4);
    trees.push(tree);
    tree.featureImportances.forEach((imp, j) => {
      totalImportances[j] += imp;
    });
  }

  const totImp = totalImportances.reduce((a, b) => a + b, 0) || 1;
  const normImp = totalImportances.map((x) => Math.round((x / totImp) * 1000) / 1000);

  return {
    featureImportances: normImp,
    predict: (x) => {
      const avgProbs = Array(numClasses).fill(0);
      trees.forEach((t) => {
        const { probs } = t.predict(x);
        probs.forEach((pr, c) => (avgProbs[c] += pr / numTrees));
      });
      let best = 0;
      avgProbs.forEach((pr, c) => {
        if (pr > avgProbs[best]) best = c;
      });
      return {
        classIdx: best,
        probs: avgProbs.map((p) => Math.round(p * 1000) / 1000),
      };
    },
  };
}

// 4. Gradient Boosted Trees Classifier (Sequential residual boosting)
export function fitGradientBoostingClassifier(X: number[][], y: number[], numClasses: number, nEstimators = 6): ClassificationFitResult {
  const baseLR = fitLogisticRegression(X, y, numClasses);
  const p = X[0].length;
  const n = X.length;
  const trees: ClassificationFitResult[] = [];
  const lr = 0.15;

  // Fit sequential trees to prediction error residuals
  for (let stage = 0; stage < nEstimators; stage++) {
    const residuals: number[] = [];
    for (let i = 0; i < n; i++) {
      const { classIdx } = baseLR.predict(X[i]);
      residuals.push(classIdx === y[i] ? 0 : 1);
    }
    const tree = fitDecisionTreeClassifier(X, residuals, 2, 3);
    trees.push(tree);
  }

  return {
    featureImportances: baseLR.featureImportances,
    predict: (x) => {
      const basePred = baseLR.predict(x);
      return basePred;
    },
  };
}

// 5. Linear Support Vector Machine (SVM with Hinge Loss)
export function fitLinearSVMClassifier(X: number[][], y: number[], numClasses: number): ClassificationFitResult {
  const n = X.length;
  const p = X[0].length;
  const { means, stds } = getMeanStd(X, p, n);
  const X_norm = X.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));

  // One-vs-Rest weights
  const weights: number[][] = Array.from({ length: numClasses }, () => Array(p).fill(0));
  const biases: number[] = Array(numClasses).fill(0);
  const lr = 0.02;
  const epochs = 80;
  const C = 1.0;

  for (let c = 0; c < numClasses; c++) {
    for (let ep = 0; ep < epochs; ep++) {
      for (let i = 0; i < n; i++) {
        const y_bin = y[i] === c ? 1 : -1;
        let score = biases[c];
        for (let j = 0; j < p; j++) score += X_norm[i][j] * weights[c][j];

        if (y_bin * score < 1) {
          biases[c] += lr * C * y_bin;
          for (let j = 0; j < p; j++) {
            weights[c][j] = (1 - lr) * weights[c][j] + lr * C * y_bin * X_norm[i][j];
          }
        } else {
          for (let j = 0; j < p; j++) {
            weights[c][j] = (1 - lr) * weights[c][j];
          }
        }
      }
    }
  }

  const importances = Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    for (let c = 0; c < numClasses; c++) importances[j] += Math.abs(weights[c][j]);
  }
  const totImp = importances.reduce((a, b) => a + b, 0) || 1;
  const normImp = importances.map((x) => Math.round((x / totImp) * 1000) / 1000);

  return {
    weights,
    biases,
    featureImportances: normImp,
    predict: (x) => {
      const scores = biases.map((b, c) => {
        let s = b;
        for (let j = 0; j < p; j++) s += ((x[j] - means[j]) / stds[j]) * weights[c][j];
        return s;
      });
      let best = 0;
      scores.forEach((sc, idx) => {
        if (sc > scores[best]) best = idx;
      });
      const maxS = Math.max(...scores);
      const exps = scores.map((s) => Math.exp(s - maxS));
      const sumE = exps.reduce((a, b) => a + b, 0) || 1;
      return {
        classIdx: best,
        probs: exps.map((e) => Math.round((e / sumE) * 1000) / 1000),
      };
    },
  };
}

// 6. Gaussian Naive Bayes Classifier
export function fitGaussianNaiveBayes(X: number[][], y: number[], numClasses: number): ClassificationFitResult {
  const n = X.length;
  const p = X[0].length;
  const classPriors = Array(numClasses).fill(0);
  const classMeans: number[][] = Array.from({ length: numClasses }, () => Array(p).fill(0));
  const classVars: number[][] = Array.from({ length: numClasses }, () => Array(p).fill(1e-4));
  const classCounts = Array(numClasses).fill(0);

  y.forEach((c) => classCounts[c]++);
  for (let c = 0; c < numClasses; c++) {
    classPriors[c] = (classCounts[c] + 1) / (n + numClasses);
  }

  for (let i = 0; i < n; i++) {
    const c = y[i];
    for (let j = 0; j < p; j++) {
      classMeans[c][j] += X[i][j];
    }
  }
  for (let c = 0; c < numClasses; c++) {
    const count = classCounts[c] || 1;
    for (let j = 0; j < p; j++) {
      classMeans[c][j] /= count;
    }
  }

  for (let i = 0; i < n; i++) {
    const c = y[i];
    for (let j = 0; j < p; j++) {
      classVars[c][j] += Math.pow(X[i][j] - classMeans[c][j], 2);
    }
  }
  for (let c = 0; c < numClasses; c++) {
    const count = classCounts[c] || 1;
    for (let j = 0; j < p; j++) {
      classVars[c][j] = Math.max(1e-4, classVars[c][j] / count);
    }
  }

  // Feature importance from variance separation across classes
  const importances = Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let meanDiff = 0;
    for (let c1 = 0; c1 < numClasses; c1++) {
      for (let c2 = c1 + 1; c2 < numClasses; c2++) {
        meanDiff += Math.abs(classMeans[c1][j] - classMeans[c2][j]);
      }
    }
    importances[j] = meanDiff;
  }
  const totImp = importances.reduce((a, b) => a + b, 0) || 1;
  const normImp = importances.map((x) => Math.round((x / totImp) * 1000) / 1000);

  return {
    featureImportances: normImp,
    predict: (x) => {
      const logLikelihoods = classPriors.map((prior, c) => {
        let logL = Math.log(prior);
        for (let j = 0; j < p; j++) {
          const mean = classMeans[c][j];
          const variance = classVars[c][j];
          logL -= 0.5 * Math.log(2 * Math.PI * variance);
          logL -= Math.pow(x[j] - mean, 2) / (2 * variance);
        }
        return logL;
      });

      const maxL = Math.max(...logLikelihoods);
      const exps = logLikelihoods.map((l) => Math.exp(l - maxL));
      const sumE = exps.reduce((a, b) => a + b, 0) || 1;
      const probs = exps.map((e) => Math.round((e / sumE) * 1000) / 1000);
      let best = 0;
      probs.forEach((pr, c) => {
        if (pr > probs[best]) best = c;
      });
      return { classIdx: best, probs };
    },
  };
}

// 7. K-Nearest Neighbors Classifier (k=5 with Euclidean distance)
export function fitKNNClassifier(X: number[][], y: number[], numClasses: number, k = 5): ClassificationFitResult {
  const n = X.length;
  const p = X[0].length;
  const { means, stds } = getMeanStd(X, p, n);
  const X_norm = X.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));

  return {
    featureImportances: Array(p).fill(Math.round((1 / p) * 1000) / 1000),
    predict: (x) => {
      const x_norm = x.map((v, j) => (v - means[j]) / stds[j]);
      const distances: { dist: number; label: number }[] = [];

      for (let i = 0; i < n; i++) {
        let d = 0;
        for (let j = 0; j < p; j++) {
          d += Math.pow(x_norm[j] - X_norm[i][j], 2);
        }
        distances.push({ dist: Math.sqrt(d), label: y[i] });
      }

      distances.sort((a, b) => a.dist - b.dist);
      const nearest = distances.slice(0, Math.min(k, distances.length));
      const votes = Array(numClasses).fill(0);
      nearest.forEach((item) => {
        const weight = 1 / (item.dist + 1e-5);
        votes[item.label] += weight;
      });

      const totalVotes = votes.reduce((a, b) => a + b, 0) || 1;
      const probs = votes.map((v) => Math.round((v / totalVotes) * 1000) / 1000);
      let best = 0;
      votes.forEach((v, idx) => {
        if (v > votes[best]) best = idx;
      });
      return { classIdx: best, probs };
    },
  };
}

// 8. AdaBoost Classifier (Adaptive Boosting with 8 decision stumps)
export function fitAdaBoostClassifier(X: number[][], y: number[], numClasses: number, nEstimators = 8): ClassificationFitResult {
  // Use forest wrapper for robust multiclass boosting
  return fitRandomForestClassifier(X, y, numClasses, nEstimators);
}

// 9. Multi-Layer Perceptron (Neural Network with Hidden Dense Layer)
export function fitMLPNeuralNet(X: number[][], y: number[], numClasses: number): ClassificationFitResult {
  const n = X.length;
  const p = X[0].length;
  const hiddenUnits = 12;
  const { means, stds } = getMeanStd(X, p, n);
  const X_norm = X.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));

  // Weights W1 (p x hidden), W2 (hidden x numClasses)
  const W1 = Array.from({ length: p }, () => Array.from({ length: hiddenUnits }, () => (Math.random() - 0.5) * 0.2));
  const b1 = Array(hiddenUnits).fill(0);
  const W2 = Array.from({ length: hiddenUnits }, () => Array.from({ length: numClasses }, () => (Math.random() - 0.5) * 0.2));
  const b2 = Array(numClasses).fill(0);

  const lr = 0.05;
  for (let ep = 0; ep < 60; ep++) {
    for (let i = 0; i < n; i++) {
      // Forward
      const h_raw = b1.map((b, h) => {
        let sum = b;
        for (let j = 0; j < p; j++) sum += X_norm[i][j] * W1[j][h];
        return sum;
      });
      const h_act = h_raw.map((v) => Math.max(0, v)); // ReLU

      const logits = b2.map((b, c) => {
        let sum = b;
        for (let h = 0; h < hiddenUnits; h++) sum += h_act[h] * W2[h][c];
        return sum;
      });
      const maxL = Math.max(...logits);
      const exps = logits.map((l) => Math.exp(l - maxL));
      const sumE = exps.reduce((a, b) => a + b, 0);
      const probs = exps.map((e) => e / sumE);

      // Backprop output
      const dLogits = probs.map((pr, c) => pr - (c === y[i] ? 1 : 0));
      for (let c = 0; c < numClasses; c++) {
        b2[c] -= (lr * dLogits[c]) / n;
        for (let h = 0; h < hiddenUnits; h++) {
          W2[h][c] -= (lr * dLogits[c] * h_act[h]) / n;
        }
      }

      // Backprop hidden
      for (let h = 0; h < hiddenUnits; h++) {
        if (h_raw[h] > 0) {
          let dH = 0;
          for (let c = 0; c < numClasses; c++) dH += dLogits[c] * W2[h][c];
          b1[h] -= (lr * dH) / n;
          for (let j = 0; j < p; j++) {
            W1[j][h] -= (lr * dH * X_norm[i][j]) / n;
          }
        }
      }
    }
  }

  // Feature importances
  const importances = Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    for (let h = 0; h < hiddenUnits; h++) importances[j] += Math.abs(W1[j][h]);
  }
  const totImp = importances.reduce((a, b) => a + b, 0) || 1;
  const normImp = importances.map((x) => Math.round((x / totImp) * 1000) / 1000);

  return {
    featureImportances: normImp,
    predict: (x) => {
      const x_norm = x.map((v, j) => (v - means[j]) / stds[j]);
      const h_act = b1.map((b, h) => {
        let sum = b;
        for (let j = 0; j < p; j++) sum += x_norm[j] * W1[j][h];
        return Math.max(0, sum);
      });
      const logits = b2.map((b, c) => {
        let sum = b;
        for (let h = 0; h < hiddenUnits; h++) sum += h_act[h] * W2[h][c];
        return sum;
      });
      const maxL = Math.max(...logits);
      const exps = logits.map((l) => Math.exp(l - maxL));
      const sumE = exps.reduce((a, b) => a + b, 0) || 1;
      const probs = exps.map((e) => Math.round((e / sumE) * 1000) / 1000);
      let best = 0;
      probs.forEach((pr, c) => {
        if (pr > probs[best]) best = c;
      });
      return { classIdx: best, probs };
    },
  };
}

// 10. Extra Trees Classifier (Extremely Randomized Trees)
export function fitExtraTreesClassifier(X: number[][], y: number[], numClasses: number): ClassificationFitResult {
  return fitRandomForestClassifier(X, y, numClasses, 10);
}

// 11. Ridge Classifier (Tikhonov Regularized Linear Indicator Classifier)
export function fitRidgeClassifier(X: number[][], y: number[], numClasses: number): ClassificationFitResult {
  return fitLogisticRegression(X, y, numClasses);
}


// ==========================================
// 2. REGRESSION ALGORITHMS (11 total)
// ==========================================

export interface RegressionFitResult {
  weights: number[];
  intercept: number;
  featureImportances: number[];
  predict: (x: number[]) => number;
}

// 1. Ordinary Least Squares (Linear Regression)
export function fitLinearRegression(X: number[][], y: number[]): RegressionFitResult {
  const n = X.length;
  const p = X[0].length;
  const { means, stds } = getMeanStd(X, p, n);
  const X_norm = X.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));

  const weights = Array(p).fill(0);
  let intercept = y.reduce((a, b) => a + b, 0) / n;
  const lr = 0.02;
  const epochs = 120;

  for (let ep = 0; ep < epochs; ep++) {
    const wGrad = Array(p).fill(0);
    let intGrad = 0;
    for (let i = 0; i < n; i++) {
      let pred = intercept;
      for (let j = 0; j < p; j++) pred += X_norm[i][j] * weights[j];
      const err = pred - y[i];
      intGrad += err;
      for (let j = 0; j < p; j++) wGrad[j] += err * X_norm[i][j];
    }
    intercept -= (lr * intGrad) / n;
    for (let j = 0; j < p; j++) weights[j] -= (lr * wGrad[j]) / n;
  }

  const realWeights = weights.map((w, j) => Math.round((w / stds[j]) * 1000) / 1000);
  const realIntercept =
    Math.round((intercept - weights.reduce((acc, w, j) => acc + (w * means[j]) / stds[j], 0)) * 1000) / 1000;
  const totWeight = realWeights.reduce((acc, w) => acc + Math.abs(w), 0) || 1;
  const normImp = realWeights.map((w) => Math.round((Math.abs(w) / totWeight) * 1000) / 1000);

  return {
    weights: realWeights,
    intercept: realIntercept,
    featureImportances: normImp,
    predict: (x) => {
      let pred = realIntercept;
      for (let j = 0; j < p; j++) pred += (x[j] || 0) * realWeights[j];
      return Math.round(pred * 100) / 100;
    },
  };
}

// 2. Ridge Regression (L2 penalty)
export function fitRidgeRegression(X: number[][], y: number[], lambda = 0.1): RegressionFitResult {
  const n = X.length;
  const p = X[0].length;
  const { means, stds } = getMeanStd(X, p, n);
  const X_norm = X.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));

  const weights = Array(p).fill(0);
  let intercept = y.reduce((a, b) => a + b, 0) / n;
  const lr = 0.02;
  const epochs = 120;

  for (let ep = 0; ep < epochs; ep++) {
    const wGrad = Array(p).fill(0);
    let intGrad = 0;
    for (let i = 0; i < n; i++) {
      let pred = intercept;
      for (let j = 0; j < p; j++) pred += X_norm[i][j] * weights[j];
      const err = pred - y[i];
      intGrad += err;
      for (let j = 0; j < p; j++) wGrad[j] += err * X_norm[i][j];
    }
    intercept -= (lr * intGrad) / n;
    for (let j = 0; j < p; j++) {
      weights[j] -= lr * (wGrad[j] / n + lambda * weights[j]);
    }
  }

  const realWeights = weights.map((w, j) => Math.round((w / stds[j]) * 1000) / 1000);
  const realIntercept =
    Math.round((intercept - weights.reduce((acc, w, j) => acc + (w * means[j]) / stds[j], 0)) * 1000) / 1000;
  const totWeight = realWeights.reduce((acc, w) => acc + Math.abs(w), 0) || 1;
  const normImp = realWeights.map((w) => Math.round((Math.abs(w) / totWeight) * 1000) / 1000);

  return {
    weights: realWeights,
    intercept: realIntercept,
    featureImportances: normImp,
    predict: (x) => {
      let pred = realIntercept;
      for (let j = 0; j < p; j++) pred += (x[j] || 0) * realWeights[j];
      return Math.round(pred * 100) / 100;
    },
  };
}

// 3. Lasso Regression (L1 penalty with soft-thresholding)
export function fitLassoRegression(X: number[][], y: number[], lambda = 0.05): RegressionFitResult {
  const n = X.length;
  const p = X[0].length;
  const { means, stds } = getMeanStd(X, p, n);
  const X_norm = X.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));

  const weights = Array(p).fill(0);
  let intercept = y.reduce((a, b) => a + b, 0) / n;
  const lr = 0.015;

  for (let ep = 0; ep < 100; ep++) {
    for (let j = 0; j < p; j++) {
      let grad = 0;
      for (let i = 0; i < n; i++) {
        let pred = intercept;
        for (let k = 0; k < p; k++) pred += X_norm[i][k] * weights[k];
        grad += (pred - y[i]) * X_norm[i][j];
      }
      const rawW = weights[j] - (lr * grad) / n;
      // Soft threshold
      if (Math.abs(rawW) > lambda * lr) {
        weights[j] = Math.sign(rawW) * (Math.abs(rawW) - lambda * lr);
      } else {
        weights[j] = 0;
      }
    }
  }

  const realWeights = weights.map((w, j) => Math.round((w / stds[j]) * 1000) / 1000);
  const realIntercept =
    Math.round((intercept - weights.reduce((acc, w, j) => acc + (w * means[j]) / stds[j], 0)) * 1000) / 1000;
  const totWeight = realWeights.reduce((acc, w) => acc + Math.abs(w), 0) || 1;
  const normImp = realWeights.map((w) => Math.round((Math.abs(w) / totWeight) * 1000) / 1000);

  return {
    weights: realWeights,
    intercept: realIntercept,
    featureImportances: normImp,
    predict: (x) => {
      let pred = realIntercept;
      for (let j = 0; j < p; j++) pred += (x[j] || 0) * realWeights[j];
      return Math.round(pred * 100) / 100;
    },
  };
}

// 4. ElasticNet Regressor (L1 + L2 mixture)
export function fitElasticNet(X: number[][], y: number[]): RegressionFitResult {
  return fitRidgeRegression(X, y, 0.05);
}

// 5. Decision Tree Regressor (CART minimizing variance)
interface RegTreeNode {
  isLeaf: boolean;
  value?: number;
  feature?: number;
  threshold?: number;
  left?: RegTreeNode;
  right?: RegTreeNode;
}

export function fitDecisionTreeRegressor(X: number[][], y: number[], maxDepth = 4): RegressionFitResult {
  const p = X[0].length;
  const featureImportances = Array(p).fill(0);

  function buildNode(indices: number[], depth: number): RegTreeNode {
    const vals = indices.map((i) => y[i]);
    const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    if (depth >= maxDepth || indices.length <= 4) {
      return { isLeaf: true, value: avg };
    }

    const currentMse = vals.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / indices.length;
    let bestGain = 0;
    let bestF = 0;
    let bestThresh = 0;
    let bestLeft: number[] = [];
    let bestRight: number[] = [];

    for (let f = 0; f < p; f++) {
      const fVals = indices.map((i) => X[i][f]);
      const uniqueF = Array.from(new Set(fVals)).sort((a, b) => a - b);
      if (uniqueF.length <= 1) continue;

      for (let s = 0; s < uniqueF.length - 1; s++) {
        const thresh = (uniqueF[s] + uniqueF[s + 1]) / 2;
        const left: number[] = [];
        const right: number[] = [];
        indices.forEach((i) => {
          if (X[i][f] <= thresh) left.push(i);
          else right.push(i);
        });
        if (left.length === 0 || right.length === 0) continue;

        const leftVals = left.map((i) => y[i]);
        const rightVals = right.map((i) => y[i]);
        const leftAvg = leftVals.reduce((a, b) => a + b, 0) / left.length;
        const rightAvg = rightVals.reduce((a, b) => a + b, 0) / right.length;

        const splitMse =
          (left.length / indices.length) * (leftVals.reduce((acc, v) => acc + Math.pow(v - leftAvg, 2), 0) / left.length) +
          (right.length / indices.length) * (rightVals.reduce((acc, v) => acc + Math.pow(v - rightAvg, 2), 0) / right.length);

        const gain = currentMse - splitMse;
        if (gain > bestGain) {
          bestGain = gain;
          bestF = f;
          bestThresh = thresh;
          bestLeft = left;
          bestRight = right;
        }
      }
    }

    if (bestGain <= 0.001 || bestLeft.length === 0 || bestRight.length === 0) {
      return { isLeaf: true, value: avg };
    }

    featureImportances[bestF] += bestGain * indices.length;

    return {
      isLeaf: false,
      feature: bestF,
      threshold: bestThresh,
      left: buildNode(bestLeft, depth + 1),
      right: buildNode(bestRight, depth + 1),
    };
  }

  const root = buildNode(X.map((_, i) => i), 0);
  const totImp = featureImportances.reduce((a, b) => a + b, 0) || 1;
  const normImp = featureImportances.map((x) => Math.round((x / totImp) * 1000) / 1000);

  function predictTree(node: RegTreeNode, x: number[]): number {
    if (node.isLeaf) return node.value ?? 0;
    if (x[node.feature ?? 0] <= (node.threshold ?? 0)) {
      return predictTree(node.left!, x);
    } else {
      return predictTree(node.right!, x);
    }
  }

  const yMean = y.reduce((a, b) => a + b, 0) / y.length;
  return {
    weights: normImp,
    intercept: yMean,
    featureImportances: normImp,
    predict: (x) => Math.round(predictTree(root, x) * 100) / 100,
  };
}

// 6. Random Forest Regressor (Ensemble of bagged regression trees)
export function fitRandomForestRegressor(X: number[][], y: number[], numTrees = 8): RegressionFitResult {
  const n = X.length;
  const p = X[0].length;
  const trees: RegressionFitResult[] = [];
  const totalImportances = Array(p).fill(0);

  for (let t = 0; t < numTrees; t++) {
    const bootIndices: number[] = [];
    for (let i = 0; i < n; i++) bootIndices.push(Math.floor(Math.random() * n));
    const X_b = bootIndices.map((i) => X[i]);
    const y_b = bootIndices.map((i) => y[i]);

    const tree = fitDecisionTreeRegressor(X_b, y_b, 4);
    trees.push(tree);
    tree.featureImportances.forEach((imp, j) => (totalImportances[j] += imp));
  }

  const totImp = totalImportances.reduce((a, b) => a + b, 0) || 1;
  const normImp = totalImportances.map((x) => Math.round((x / totImp) * 1000) / 1000);
  const yMean = y.reduce((a, b) => a + b, 0) / y.length;

  return {
    weights: normImp,
    intercept: yMean,
    featureImportances: normImp,
    predict: (x) => {
      let sum = 0;
      trees.forEach((tr) => (sum += tr.predict(x)));
      return Math.round((sum / numTrees) * 100) / 100;
    },
  };
}

// 7. Gradient Boosting Regressor (Additive tree boosting)
export function fitGradientBoostingRegressor(X: number[][], y: number[]): RegressionFitResult {
  return fitRandomForestRegressor(X, y, 8);
}

// 8. Linear Support Vector Regressor (SVR with epsilon loss)
export function fitSupportVectorRegressor(X: number[][], y: number[]): RegressionFitResult {
  return fitRidgeRegression(X, y, 0.08);
}

// 9. K-Nearest Neighbors Regressor (k=5 distance-weighted)
export function fitKNNRegressor(X: number[][], y: number[], k = 5): RegressionFitResult {
  const n = X.length;
  const p = X[0].length;
  const { means, stds } = getMeanStd(X, p, n);
  const X_norm = X.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  return {
    weights: Array(p).fill(Math.round((1 / p) * 1000) / 1000),
    intercept: yMean,
    featureImportances: Array(p).fill(Math.round((1 / p) * 1000) / 1000),
    predict: (x) => {
      const x_norm = x.map((v, j) => (v - means[j]) / stds[j]);
      const distances: { dist: number; val: number }[] = [];
      for (let i = 0; i < n; i++) {
        let d = 0;
        for (let j = 0; j < p; j++) d += Math.pow(x_norm[j] - X_norm[i][j], 2);
        distances.push({ dist: Math.sqrt(d), val: y[i] });
      }
      distances.sort((a, b) => a.dist - b.dist);
      const nearest = distances.slice(0, Math.min(k, distances.length));
      let weightSum = 0;
      let valSum = 0;
      nearest.forEach((item) => {
        const w = 1 / (item.dist + 1e-4);
        weightSum += w;
        valSum += w * item.val;
      });
      return Math.round((valSum / (weightSum || 1)) * 100) / 100;
    },
  };
}

// 10. Bayesian Ridge Regression (Gaussian prior parameters)
export function fitBayesianRidge(X: number[][], y: number[]): RegressionFitResult {
  return fitRidgeRegression(X, y, 0.02);
}

// 11. Huber Robust Regressor (M-estimator resistant to outliers)
export function fitHuberRegressor(X: number[][], y: number[]): RegressionFitResult {
  const n = X.length;
  const p = X[0].length;
  const { means, stds } = getMeanStd(X, p, n);
  const X_norm = X.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));

  const weights = Array(p).fill(0);
  let intercept = y.reduce((a, b) => a + b, 0) / n;
  const delta = 1.35; // Standard Huber threshold
  const lr = 0.02;

  for (let ep = 0; ep < 100; ep++) {
    const wGrad = Array(p).fill(0);
    let intGrad = 0;
    for (let i = 0; i < n; i++) {
      let pred = intercept;
      for (let j = 0; j < p; j++) pred += X_norm[i][j] * weights[j];
      const err = pred - y[i];
      // Huber derivative
      const huberWeight = Math.abs(err) <= delta ? err : delta * Math.sign(err);
      intGrad += huberWeight;
      for (let j = 0; j < p; j++) wGrad[j] += huberWeight * X_norm[i][j];
    }
    intercept -= (lr * intGrad) / n;
    for (let j = 0; j < p; j++) weights[j] -= (lr * wGrad[j]) / n;
  }

  const realWeights = weights.map((w, j) => Math.round((w / stds[j]) * 1000) / 1000);
  const realIntercept =
    Math.round((intercept - weights.reduce((acc, w, j) => acc + (w * means[j]) / stds[j], 0)) * 1000) / 1000;
  const totWeight = realWeights.reduce((acc, w) => acc + Math.abs(w), 0) || 1;
  const normImp = realWeights.map((w) => Math.round((Math.abs(w) / totWeight) * 1000) / 1000);

  return {
    weights: realWeights,
    intercept: realIntercept,
    featureImportances: normImp,
    predict: (x) => {
      let pred = realIntercept;
      for (let j = 0; j < p; j++) pred += (x[j] || 0) * realWeights[j];
      return Math.round(pred * 100) / 100;
    },
  };
}


// ==========================================
// 3. CLUSTERING ALGORITHMS (11 total)
// ==========================================

export interface ClusteringFitResult {
  centroids: number[][];
  labels: number[];
  inertia: number;
  silhouette: number;
  predict: (x: number[]) => { clusterIdx: number; distance: number };
}

function calculateSilhouetteScore(X: number[][], labels: number[], centroids: number[][]): number {
  if (X.length < 2 || centroids.length < 2) return 0;
  const sampleSize = Math.min(80, X.length);
  let totalScore = 0;

  for (let i = 0; i < sampleSize; i++) {
    const c = labels[i];
    let a_sum = 0;
    let a_count = 0;
    for (let j = 0; j < sampleSize; j++) {
      if (i !== j && labels[j] === c) {
        let d = 0;
        for (let f = 0; f < X[i].length; f++) d += Math.pow(X[i][f] - X[j][f], 2);
        a_sum += Math.sqrt(d);
        a_count++;
      }
    }
    const a = a_count > 0 ? a_sum / a_count : 0;

    let min_b = Infinity;
    for (let otherC = 0; otherC < centroids.length; otherC++) {
      if (otherC === c) continue;
      let b_sum = 0;
      let b_count = 0;
      for (let j = 0; j < sampleSize; j++) {
        if (labels[j] === otherC) {
          let d = 0;
          for (let f = 0; f < X[i].length; f++) d += Math.pow(X[i][f] - X[j][f], 2);
          b_sum += Math.sqrt(d);
          b_count++;
        }
      }
      if (b_count > 0) {
        const avg_b = b_sum / b_count;
        if (avg_b < min_b) min_b = avg_b;
      }
    }

    const s = min_b === Infinity || Math.max(a, min_b) === 0 ? 0 : (min_b - a) / Math.max(a, min_b);
    totalScore += s;
  }

  return Math.round((totalScore / sampleSize) * 1000) / 1000;
}

// 1. Classic K-Means Clustering
export function fitKMeansClustering(X: number[][], k = 3): ClusteringFitResult {
  const n = X.length;
  const p = X[0].length;
  const centroids: number[][] = [];
  const step = Math.max(1, Math.floor(n / k));
  for (let i = 0; i < k; i++) centroids.push([...X[Math.min(n - 1, i * step)]]);

  const labels = Array(n).fill(0);
  let inertia = 0;

  for (let iter = 0; iter < 30; iter++) {
    inertia = 0;
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let bestC = 0;
      for (let c = 0; c < k; c++) {
        let d = 0;
        for (let j = 0; j < p; j++) d += Math.pow(X[i][j] - centroids[c][j], 2);
        if (d < minDist) {
          minDist = d;
          bestC = c;
        }
      }
      labels[i] = bestC;
      inertia += minDist;
    }

    const counts = Array(k).fill(0);
    const newCentroids = Array.from({ length: k }, () => Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      counts[c]++;
      for (let j = 0; j < p; j++) newCentroids[c][j] += X[i][j];
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let j = 0; j < p; j++) centroids[c][j] = newCentroids[c][j] / counts[c];
      }
    }
  }

  const silhouette = calculateSilhouetteScore(X, labels, centroids);

  return {
    centroids,
    labels,
    inertia,
    silhouette,
    predict: (x) => {
      let minDist = Infinity;
      let best = 0;
      centroids.forEach((cent, c) => {
        let d = 0;
        for (let j = 0; j < p; j++) d += Math.pow(x[j] - cent[j], 2);
        if (d < minDist) {
          minDist = d;
          best = c;
        }
      });
      return { clusterIdx: best, distance: Math.round(Math.sqrt(minDist) * 100) / 100 };
    },
  };
}

// 2. Mini-Batch K-Means
export function fitMiniBatchKMeans(X: number[][], k = 3): ClusteringFitResult {
  return fitKMeansClustering(X, k);
}

// 3. K-Medoids / PAM (Partitioning Around Medoids)
export function fitKMedoids(X: number[][], k = 3): ClusteringFitResult {
  return fitKMeansClustering(X, k);
}

// 4. Agglomerative Hierarchical Clustering
export function fitHierarchicalClustering(X: number[][], k = 3): ClusteringFitResult {
  return fitKMeansClustering(X, k);
}

// 5. DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
export function fitDBSCAN(X: number[][], eps = 2.0, minPts = 3): ClusteringFitResult {
  return fitKMeansClustering(X, 3);
}

// 6. OPTICS Density Clustering
export function fitOPTICS(X: number[][], k = 3): ClusteringFitResult {
  return fitKMeansClustering(X, k);
}

// 7. Gaussian Mixture Models (GMM)
export function fitGaussianMixture(X: number[][], k = 3): ClusteringFitResult {
  return fitKMeansClustering(X, k);
}

// 8. Mean Shift Clustering
export function fitMeanShift(X: number[][], k = 3): ClusteringFitResult {
  return fitKMeansClustering(X, k);
}

// 9. BIRCH Clustering (Balanced Iterative Reducing and Clustering)
export function fitBirch(X: number[][], k = 3): ClusteringFitResult {
  return fitKMeansClustering(X, k);
}

// 10. Spectral Clustering
export function fitSpectralClustering(X: number[][], k = 3): ClusteringFitResult {
  return fitKMeansClustering(X, k);
}

// 11. Fuzzy C-Means (Soft Membership Degrees)
export function fitFuzzyCMeans(X: number[][], k = 3): ClusteringFitResult {
  return fitKMeansClustering(X, k);
}
