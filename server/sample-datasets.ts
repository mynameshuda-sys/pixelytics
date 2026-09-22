export interface SampleDataset {
  name: string;
  filename: string;
  description: string;
  data: Record<string, any>[];
}

export function getSampleDatasets(): SampleDataset[] {
  // 1. Customer Churn
  const churnData: Record<string, any>[] = [];
  const contracts = ['Month-to-month', 'One year', 'Two year'];
  const internetTypes = ['Fiber optic', 'DSL', 'None'];
  const yesNo = ['Yes', 'No'];

  for (let i = 1; i <= 350; i++) {
    const tenure = Math.floor(Math.random() * 70) + 1;
    const contract = contracts[i % 3];
    const internet = internetTypes[i % 3];
    const techSupport = internet === 'None' ? 'No' : yesNo[(i * 3) % 2];
    const monthlyCharges = Math.round((20 + (internet === 'Fiber optic' ? 50 : 25) + (Math.random() * 30)) * 10) / 10;
    const totalCharges = Math.round((tenure * monthlyCharges + (Math.random() * 50)) * 10) / 10;

    // Churn probability higher if short tenure, high charges, month-to-month
    const churnScore =
      (contract === 'Month-to-month' ? 0.45 : 0.1) +
      (tenure < 12 ? 0.35 : 0.05) +
      (techSupport === 'No' ? 0.15 : 0) +
      (monthlyCharges > 75 ? 0.15 : 0);
    const churn = Math.random() < churnScore ? 'Yes' : 'No';

    churnData.push({
      customer_id: `CUST-${1000 + i}`,
      tenure,
      contract,
      internet_service: internet,
      tech_support: techSupport,
      monthly_charges: monthlyCharges,
      total_charges: totalCharges,
      churn,
    });
  }

  // 2. Housing Prices
  const housingData: Record<string, any>[] = [];
  const locations = ['Downtown', 'Suburbs', 'Westside', 'Metro North', 'Bayside'];

  for (let i = 1; i <= 300; i++) {
    const bedrooms = (i % 4) + 2; // 2, 3, 4, 5
    const bathrooms = Math.round((bedrooms * 0.6 + (Math.random() * 0.8)) * 2) / 2;
    const sqft = Math.floor(bedrooms * 550 + Math.random() * 750 + 700);
    const location = locations[i % 5];
    const yearBuilt = 1975 + Math.floor(Math.random() * 45);
    const garage = (i % 3) + 1;

    const locMultiplier =
      location === 'Downtown' ? 1.4 : location === 'Westside' ? 1.25 : location === 'Bayside' ? 1.15 : 1.0;
    const basePrice = sqft * 210 + bedrooms * 15000 + bathrooms * 18000 + (yearBuilt - 1975) * 800;
    const price = Math.round((basePrice * locMultiplier + (Math.random() * 20000 - 10000)) / 1000) * 1000;

    housingData.push({
      house_id: `HS-${2000 + i}`,
      sqft_living: sqft,
      bedrooms,
      bathrooms,
      location,
      year_built: yearBuilt,
      garage_spaces: garage,
      price,
    });
  }

  // 3. Diabetes Indicators
  const diabetesData: Record<string, any>[] = [];
  for (let i = 1; i <= 280; i++) {
    const age = Math.floor(Math.random() * 50) + 21;
    const bmi = Math.round((18.5 + Math.random() * 24) * 10) / 10;
    const glucose = Math.floor(70 + Math.random() * 110);
    const bloodPressure = Math.floor(60 + Math.random() * 40);
    const insulin = Math.floor(15 + Math.random() * 220);

    const riskScore = (glucose > 130 ? 0.45 : 0.05) + (bmi > 30 ? 0.3 : 0.05) + (age > 45 ? 0.2 : 0.05);
    const outcome = Math.random() < riskScore ? 'Diabetic' : 'Normal';

    diabetesData.push({
      patient_id: `PT-${3000 + i}`,
      age,
      bmi,
      glucose,
      blood_pressure: bloodPressure,
      insulin,
      outcome,
    });
  }

  // 4. Retail Customer Segmentation
  const segmentationData: Record<string, any>[] = [];
  for (let i = 1; i <= 250; i++) {
    const annualIncome = Math.floor(20 + Math.random() * 105);
    const spendingScore = Math.floor(1 + Math.random() * 99);
    const purchaseFreq = Math.floor(2 + Math.random() * 30);
    const avgOrderValue = Math.round((35 + Math.random() * 220) * 10) / 10;
    const loyaltyMonths = Math.floor(3 + Math.random() * 48);

    segmentationData.push({
      customer_id: `RET-${4000 + i}`,
      annual_income_k: annualIncome,
      spending_score: spendingScore,
      purchase_frequency: purchaseFreq,
      avg_order_value: avgOrderValue,
      loyalty_months: loyaltyMonths,
    });
  }

  return [
    {
      name: 'Telecom Customer Churn',
      filename: 'customer_churn.csv',
      description: 'Predict whether telecom subscribers will cancel their subscription based on tenure, service type, and charges.',
      data: churnData,
    },
    {
      name: 'Residential Property Valuations',
      filename: 'housing_prices.csv',
      description: 'Predict residential home market sale values from square footage, bedroom count, location, and age.',
      data: housingData,
    },
    {
      name: 'Diagnostic Diabetes Risk',
      filename: 'diabetes_indicators.csv',
      description: 'Classify whether a clinical patient has elevated diabetes risk based on diagnostic vitals.',
      data: diabetesData,
    },
    {
      name: 'Retail Customer Segmentation',
      filename: 'customer_segments.csv',
      description: 'Unsupervised segmentation of retail shoppers using income, spend intensity, and purchase behavior.',
      data: segmentationData,
    },
  ];
}
