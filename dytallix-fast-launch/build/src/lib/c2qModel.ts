export type AssetType =
  | 'real_estate'
  | 'invoice'
  | 'commodity'
  | 'nft'
  | 'data_vault'
  | 'bank_account'
  | 'tokenized_security'
  | 'fiat'
  | 'crypto_btc'
  | 'crypto_eth';

export type Liquidity = 'high' | 'low';
export type Volatility = 'stable' | 'volatile';
export type Jurisdiction = 'US' | 'EU' | 'Global';

export type ScenarioType = 'classic' | 'hybrid' | 'clean_break';
export type ExecutiveRecommendation = 'defer' | 'hybrid' | 'clean_break';

export interface C2QModelInputs {
  assetType: AssetType;
  assetValue: number;
  riskHorizon: number;
  haircutPct: number;
  demurrageRate: number;
  hasEncumbrances: boolean;
  liquidity: Liquidity;
  volatility: Volatility;
  jurisdiction: Jurisdiction;
  jurisdictionRiskMultiplier: number;
  hybridResidualFactor: number;
  cleanBreakResidualFloor: number;
  operationalFrictionPct: number;
  discountRate: number;
}

export interface ScenarioOutputs {
  scenario: ScenarioType;
  label: string;
  npv: number;
  expectedLoss: number;
  tailRiskLoss: number;
  expectedLossAvoided: number;
  tailRiskAvoided: number;
  frictionCost: number;
  timeToMigrateMonths: number;
  residualExposurePct: number;
  breakEvenMonths: number | null;
}

export interface AllScenarioOutputs {
  classic: ScenarioOutputs;
  hybrid: ScenarioOutputs;
  cleanBreak: ScenarioOutputs;
}

export interface ExecutiveRiskSummary {
  expectedLossClassical: number;
  tailRiskLoss: number;
  breakEvenMonths: number | null;
  residualExposurePct: number;
  migrationFrictionCost: number;
  recommendation: ExecutiveRecommendation;
  recommendationLabel: string;
  recommendedScenario: ScenarioType;
  rationale: string;
}

export interface SensitivityDriver {
  key: string;
  label: string;
  inputRangeLabel: string;
  expectedLossDelta: number;
  expectedLossDeltaPct: number;
  breakEvenDeltaMonths: number;
  breakEvenDeltaPct: number;
  expectedLossRange: [number, number];
  breakEvenRangeMonths: [number | null, number | null];
  impactScore: number;
}

export const DEFAULT_MODEL_INPUTS: C2QModelInputs = {
  assetType: 'real_estate',
  assetValue: 500000,
  riskHorizon: 5,
  haircutPct: 10,
  demurrageRate: 2,
  hasEncumbrances: false,
  liquidity: 'high',
  volatility: 'stable',
  jurisdiction: 'US',
  jurisdictionRiskMultiplier: 1,
  hybridResidualFactor: 0.35,
  cleanBreakResidualFloor: 0.02,
  operationalFrictionPct: 4,
  discountRate: 8,
};

export const modelConfig = {
  quantum: {
    alpha: 1,
    midpointYears: 5,
    integrationStep: 0.25,
    probabilityScale: 0.62,
  },
  tailRisk: {
    confidence: 0.95,
  },
  recommendation: {
    hybridResidualThresholdPct: 20,
    cleanBreakHorizonYears: 7,
  },
  scenario: {
    minCleanResidualFloor: 0.005,
  },
  sensitivity: {
    variationPct: 0.2,
    topDrivers: 5,
  },
} as const;

const SCENARIO_LABELS: Record<ScenarioType, string> = {
  classic: 'Do Nothing (Classic)',
  hybrid: 'Hybrid Retrofit',
  clean_break: 'Clean Break (PQC-native)',
};

const JURISDICTION_BASE_MULTIPLIERS: Record<Jurisdiction, number> = {
  US: 1,
  EU: 1.08,
  Global: 1.2,
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

interface BaseRiskProfile {
  normalized: C2QModelInputs;
  classicalExpectedLoss: number;
  classicalTailLoss: number;
  hybridFrictionRate: number;
  cleanBreakFrictionRate: number;
  hybridMigrationMonths: number;
  cleanBreakMigrationMonths: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toRate = (percent: number): number => percent / 100;

const confidenceToZScore = (confidence: number): number => {
  if (confidence >= 0.99) return 2.326;
  if (confidence >= 0.975) return 1.96;
  return 1.645;
};

const formatBreakEven = (months: number | null): string => {
  if (months === null || !Number.isFinite(months)) {
    return 'No break-even in modeled horizon';
  }
  if (months >= 24) {
    return `${(months / 12).toFixed(1)} years`;
  }
  return `${months.toFixed(1)} months`;
};

const normalizeInputs = (inputs: C2QModelInputs): C2QModelInputs => {
  const jurisdictionBase = getJurisdictionBaseMultiplier(inputs.jurisdiction);

  return {
    ...inputs,
    assetValue: Math.max(0, inputs.assetValue),
    riskHorizon: clamp(inputs.riskHorizon, 1, 30),
    haircutPct: clamp(inputs.haircutPct, 0, 80),
    demurrageRate: clamp(inputs.demurrageRate, 0, 20),
    jurisdictionRiskMultiplier: clamp(
      Number.isFinite(inputs.jurisdictionRiskMultiplier)
        ? inputs.jurisdictionRiskMultiplier
        : jurisdictionBase,
      0.75,
      2,
    ),
    hybridResidualFactor: clamp(inputs.hybridResidualFactor, 0.05, 0.95),
    cleanBreakResidualFloor: clamp(
      inputs.cleanBreakResidualFloor,
      modelConfig.scenario.minCleanResidualFloor,
      0.35,
    ),
    operationalFrictionPct: clamp(inputs.operationalFrictionPct, 0, 30),
    discountRate: clamp(inputs.discountRate, 0.5, 35),
  };
};

// D(t) models remaining classical security; 1 - D(t) is quantum compromise pressure.
export function quantumDecay(
  t: number,
  alpha = modelConfig.quantum.alpha,
  midpointYears = modelConfig.quantum.midpointYears,
): number {
  return 1 / (1 + Math.exp(alpha * (t - midpointYears)));
}

export function getScenarioLabel(scenario: ScenarioType): string {
  return SCENARIO_LABELS[scenario];
}

export function getJurisdictionBaseMultiplier(jurisdiction: Jurisdiction): number {
  return JURISDICTION_BASE_MULTIPLIERS[jurisdiction];
}

export function formatAssetType(assetType: AssetType): string {
  return assetType.replace(/_/g, ' ');
}

const computeBaseRiskProfile = (inputs: C2QModelInputs): BaseRiskProfile => {
  const normalized = normalizeInputs(inputs);
  const horizon = normalized.riskHorizon;
  const step = modelConfig.quantum.integrationStep;

  // Integrate risk over time so longer horizons and steeper decay raise exposure.
  let integratedRisk = 0;
  for (let t = 0; t <= horizon; t += step) {
    integratedRisk += (1 - quantumDecay(t)) * step;
  }

  const averageRisk = integratedRisk / horizon;
  const baselineCompromiseProbability =
    1 - Math.exp(-averageRisk * horizon * modelConfig.quantum.probabilityScale);

  const volatilityProbabilityMultiplier = normalized.volatility === 'volatile' ? 1.2 : 1;
  const jurisdictionProbabilityMultiplier = normalized.jurisdictionRiskMultiplier;
  const encumbranceProbabilityMultiplier = normalized.hasEncumbrances ? 1.08 : 1;

  const compromiseProbability = clamp(
    baselineCompromiseProbability *
      volatilityProbabilityMultiplier *
      jurisdictionProbabilityMultiplier *
      encumbranceProbabilityMultiplier,
    0,
    0.995,
  );

  const severity = clamp(
    0.42 +
      (normalized.volatility === 'volatile' ? 0.2 : 0.08) +
      (normalized.liquidity === 'low' ? 0.14 : 0.05) +
      (normalized.jurisdictionRiskMultiplier - 1) * 0.22 +
      (normalized.hasEncumbrances ? 0.09 : 0),
    0.3,
    0.98,
  );

  const classicalExpectedLoss = normalized.assetValue * compromiseProbability * severity;

  // Lognormal-style tail scaling approximates P95/P99 loss amplification.
  const zScore = confidenceToZScore(modelConfig.tailRisk.confidence);
  const sigma =
    0.28 +
    (normalized.volatility === 'volatile' ? 0.2 : 0.08) +
    (normalized.liquidity === 'low' ? 0.1 : 0.03) +
    (normalized.jurisdictionRiskMultiplier - 1) * 0.18;

  const tailMultiplier = Math.max(1.12, Math.exp(sigma * zScore - 0.5 * sigma * sigma));
  const classicalTailLoss = Math.min(normalized.assetValue, classicalExpectedLoss * tailMultiplier);

  const haircutRate = toRate(normalized.haircutPct);
  const demurrageRate = toRate(normalized.demurrageRate);
  const operationalFrictionRate = toRate(normalized.operationalFrictionPct);
  const liquidityOpsAdder = normalized.liquidity === 'low' ? 0.014 : 0.006;

  const hybridFrictionRate = clamp(
    operationalFrictionRate + haircutRate * 0.35 + demurrageRate * 0.5 + liquidityOpsAdder,
    0.005,
    0.75,
  );

  const cleanBreakFrictionRate = clamp(
    operationalFrictionRate * 1.45 +
      haircutRate * 0.85 +
      demurrageRate * 0.9 +
      liquidityOpsAdder * 1.6,
    0.01,
    0.95,
  );

  const complexityUnits =
    (normalized.volatility === 'volatile' ? 2 : 0) +
    (normalized.liquidity === 'low' ? 2 : 0) +
    (normalized.hasEncumbrances ? 2 : 0) +
    (normalized.jurisdictionRiskMultiplier > 1.1 ? 2 : 0);

  const hybridMigrationMonths = Math.round(6 + horizon * 0.4 + complexityUnits);
  const cleanBreakMigrationMonths = Math.round(12 + horizon * 0.6 + complexityUnits * 1.4);

  return {
    normalized,
    classicalExpectedLoss,
    classicalTailLoss,
    hybridFrictionRate,
    cleanBreakFrictionRate,
    hybridMigrationMonths,
    cleanBreakMigrationMonths,
  };
};

const buildScenarioOutput = (
  scenario: ScenarioType,
  profile: BaseRiskProfile,
): ScenarioOutputs => {
  const { normalized } = profile;
  const discountRate = toRate(normalized.discountRate);
  const discountFactor = 1 / Math.pow(1 + discountRate, normalized.riskHorizon);

  let residualFactor = 1;
  let tailFactor = 1;
  let frictionRate = 0;
  let timeToMigrateMonths = 0;

  if (scenario === 'hybrid') {
    residualFactor = normalized.hybridResidualFactor;
    tailFactor = Math.min(1, normalized.hybridResidualFactor + 0.08);
    frictionRate = profile.hybridFrictionRate;
    timeToMigrateMonths = profile.hybridMigrationMonths;
  }

  if (scenario === 'clean_break') {
    residualFactor = Math.max(
      normalized.cleanBreakResidualFloor,
      modelConfig.scenario.minCleanResidualFloor + (normalized.hasEncumbrances ? 0.004 : 0),
    );
    tailFactor = Math.max(normalized.cleanBreakResidualFloor, residualFactor * 1.15);
    frictionRate = profile.cleanBreakFrictionRate;
    timeToMigrateMonths = profile.cleanBreakMigrationMonths;
  }

  const expectedLoss = profile.classicalExpectedLoss * residualFactor;
  const tailRiskLoss = profile.classicalTailLoss * tailFactor;
  const frictionCost = normalized.assetValue * frictionRate;

  const expectedLossAvoided = Math.max(0, profile.classicalExpectedLoss - expectedLoss);
  const tailRiskAvoided = Math.max(0, profile.classicalTailLoss - tailRiskLoss);

  const discountedLossAvoided = expectedLossAvoided * discountFactor;

  const npv =
    scenario === 'classic'
      ? -(profile.classicalExpectedLoss * discountFactor)
      : discountedLossAvoided - frictionCost;

  const annualLossAvoided = expectedLossAvoided / normalized.riskHorizon;
  const breakEvenMonths =
    scenario === 'classic' || annualLossAvoided <= 0
      ? null
      : (frictionCost / annualLossAvoided) * 12;

  const residualExposurePct =
    profile.classicalExpectedLoss > 0
      ? (expectedLoss / profile.classicalExpectedLoss) * 100
      : 0;

  return {
    scenario,
    label: SCENARIO_LABELS[scenario],
    npv,
    expectedLoss,
    tailRiskLoss,
    expectedLossAvoided,
    tailRiskAvoided,
    frictionCost,
    timeToMigrateMonths,
    residualExposurePct,
    breakEvenMonths,
  };
};

const computeScenarioSet = (inputs: C2QModelInputs): AllScenarioOutputs => {
  const profile = computeBaseRiskProfile(inputs);

  return {
    classic: buildScenarioOutput('classic', profile),
    hybrid: buildScenarioOutput('hybrid', profile),
    cleanBreak: buildScenarioOutput('clean_break', profile),
  };
};

export function runScenario(
  inputs: C2QModelInputs,
  scenarioType: ScenarioType,
): ScenarioOutputs {
  const all = computeScenarioSet(inputs);
  if (scenarioType === 'clean_break') return all.cleanBreak;
  return all[scenarioType];
}

export function runAllScenarios(inputs: C2QModelInputs): AllScenarioOutputs {
  return computeScenarioSet(inputs);
}

const recommendationLabel = (recommendation: ExecutiveRecommendation): string => {
  if (recommendation === 'clean_break') return 'Clean Break';
  if (recommendation === 'hybrid') return 'Hybrid';
  return 'Defer';
};

export function computeExecutiveRiskSummary(
  inputs: C2QModelInputs,
  scenarios: AllScenarioOutputs = runAllScenarios(inputs),
): ExecutiveRiskSummary {
  let recommendation: ExecutiveRecommendation;
  let recommendedScenario: ScenarioType;

  if (
    scenarios.hybrid.residualExposurePct >
      modelConfig.recommendation.hybridResidualThresholdPct ||
    inputs.riskHorizon <= modelConfig.recommendation.cleanBreakHorizonYears
  ) {
    recommendation = 'clean_break';
    recommendedScenario = 'clean_break';
  } else if (scenarios.classic.expectedLoss < scenarios.hybrid.frictionCost) {
    recommendation = 'defer';
    recommendedScenario = 'classic';
  } else {
    recommendation = 'hybrid';
    recommendedScenario = 'hybrid';
  }

  const selectedScenario =
    recommendedScenario === 'clean_break' ? scenarios.cleanBreak : scenarios[recommendedScenario];

  let rationale =
    'Expected loss materially exceeds migration friction while hybrid residual exposure stays under threshold.';

  if (recommendation === 'clean_break') {
    rationale =
      `Hybrid residual exposure (${scenarios.hybrid.residualExposurePct.toFixed(1)}%) exceeds ${modelConfig.recommendation.hybridResidualThresholdPct}% or horizon (${inputs.riskHorizon}y) is at/under ${modelConfig.recommendation.cleanBreakHorizonYears} years.`;
  }

  if (recommendation === 'defer') {
    rationale =
      `Classical expected loss (${currencyFormatter.format(scenarios.classic.expectedLoss)}) remains below migration friction (${currencyFormatter.format(scenarios.hybrid.frictionCost)}).`;
  }

  return {
    expectedLossClassical: scenarios.classic.expectedLoss,
    tailRiskLoss: scenarios.classic.tailRiskLoss,
    breakEvenMonths: selectedScenario.breakEvenMonths,
    residualExposurePct: selectedScenario.residualExposurePct,
    migrationFrictionCost: scenarios.hybrid.frictionCost,
    recommendation,
    recommendationLabel: recommendationLabel(recommendation),
    recommendedScenario,
    rationale,
  };
}

const numericNullableRange = (a: number | null, b: number | null): [number | null, number | null] => {
  if (a === null && b === null) return [null, null];
  if (a === null && b !== null) return [b, null];
  if (a !== null && b === null) return [a, null];
  return a! <= b! ? [a!, b!] : [b!, a!];
};

const numericRange = (a: number, b: number): [number, number] =>
  a <= b ? [a, b] : [b, a];

const breakEvenFallback = (value: number | null, inputs: C2QModelInputs): number => {
  if (value === null) return inputs.riskHorizon * 24;
  return value;
};

export function computeSensitivity(inputs: C2QModelInputs): SensitivityDriver[] {
  const baselineScenarios = runAllScenarios(inputs);
  const baselineSummary = computeExecutiveRiskSummary(inputs, baselineScenarios);
  const baselineExpectedLoss = baselineScenarios.classic.expectedLoss;
  const baselineBreakEven = breakEvenFallback(baselineSummary.breakEvenMonths, inputs);

  const v = modelConfig.sensitivity.variationPct;

  const variations: Array<{
    key: string;
    label: string;
    inputRangeLabel: string;
    lowInputs: C2QModelInputs;
    highInputs: C2QModelInputs;
  }> = [
    {
      key: 'risk_horizon',
      label: 'Quantum risk horizon',
      inputRangeLabel: `${clamp(inputs.riskHorizon * (1 - v), 1, 30).toFixed(1)}y to ${clamp(inputs.riskHorizon * (1 + v), 1, 30).toFixed(1)}y`,
      lowInputs: { ...inputs, riskHorizon: clamp(inputs.riskHorizon * (1 - v), 1, 30) },
      highInputs: { ...inputs, riskHorizon: clamp(inputs.riskHorizon * (1 + v), 1, 30) },
    },
    {
      key: 'haircut',
      label: 'Haircut',
      inputRangeLabel: `${clamp(inputs.haircutPct * (1 - v), 0, 80).toFixed(1)}% to ${clamp(inputs.haircutPct * (1 + v), 0, 80).toFixed(1)}%`,
      lowInputs: { ...inputs, haircutPct: clamp(inputs.haircutPct * (1 - v), 0, 80) },
      highInputs: { ...inputs, haircutPct: clamp(inputs.haircutPct * (1 + v), 0, 80) },
    },
    {
      key: 'demurrage',
      label: 'Demurrage rate',
      inputRangeLabel: `${clamp(inputs.demurrageRate * (1 - v), 0, 20).toFixed(2)}% to ${clamp(inputs.demurrageRate * (1 + v), 0, 20).toFixed(2)}%`,
      lowInputs: { ...inputs, demurrageRate: clamp(inputs.demurrageRate * (1 - v), 0, 20) },
      highInputs: { ...inputs, demurrageRate: clamp(inputs.demurrageRate * (1 + v), 0, 20) },
    },
    {
      key: 'liquidity',
      label: 'Liquidity',
      inputRangeLabel: 'high to low',
      lowInputs: { ...inputs, liquidity: 'high' },
      highInputs: { ...inputs, liquidity: 'low' },
    },
    {
      key: 'volatility',
      label: 'Volatility',
      inputRangeLabel: 'stable to volatile',
      lowInputs: { ...inputs, volatility: 'stable' },
      highInputs: { ...inputs, volatility: 'volatile' },
    },
    {
      key: 'jurisdiction_multiplier',
      label: 'Jurisdiction risk multiplier',
      inputRangeLabel: `${clamp(inputs.jurisdictionRiskMultiplier * (1 - v), 0.75, 2).toFixed(2)} to ${clamp(inputs.jurisdictionRiskMultiplier * (1 + v), 0.75, 2).toFixed(2)}`,
      lowInputs: {
        ...inputs,
        jurisdictionRiskMultiplier: clamp(inputs.jurisdictionRiskMultiplier * (1 - v), 0.75, 2),
      },
      highInputs: {
        ...inputs,
        jurisdictionRiskMultiplier: clamp(inputs.jurisdictionRiskMultiplier * (1 + v), 0.75, 2),
      },
    },
    {
      key: 'hybrid_residual',
      label: 'Hybrid residual factor',
      inputRangeLabel: `${clamp(inputs.hybridResidualFactor * (1 - v), 0.05, 0.95).toFixed(2)} to ${clamp(inputs.hybridResidualFactor * (1 + v), 0.05, 0.95).toFixed(2)}`,
      lowInputs: {
        ...inputs,
        hybridResidualFactor: clamp(inputs.hybridResidualFactor * (1 - v), 0.05, 0.95),
      },
      highInputs: {
        ...inputs,
        hybridResidualFactor: clamp(inputs.hybridResidualFactor * (1 + v), 0.05, 0.95),
      },
    },
    {
      key: 'discount_rate',
      label: 'Discount rate',
      inputRangeLabel: `${clamp(inputs.discountRate * (1 - v), 0.5, 35).toFixed(2)}% to ${clamp(inputs.discountRate * (1 + v), 0.5, 35).toFixed(2)}%`,
      lowInputs: { ...inputs, discountRate: clamp(inputs.discountRate * (1 - v), 0.5, 35) },
      highInputs: { ...inputs, discountRate: clamp(inputs.discountRate * (1 + v), 0.5, 35) },
    },
  ];

  return variations
    .map((variation) => {
      const lowScenarios = runAllScenarios(variation.lowInputs);
      const highScenarios = runAllScenarios(variation.highInputs);

      const lowSummary = computeExecutiveRiskSummary(variation.lowInputs, lowScenarios);
      const highSummary = computeExecutiveRiskSummary(variation.highInputs, highScenarios);

      const lowExpectedLoss = lowScenarios.classic.expectedLoss;
      const highExpectedLoss = highScenarios.classic.expectedLoss;

      const expectedLossDelta = Math.max(
        Math.abs(lowExpectedLoss - baselineExpectedLoss),
        Math.abs(highExpectedLoss - baselineExpectedLoss),
      );

      const lowBreakEvenForRanking = breakEvenFallback(lowSummary.breakEvenMonths, variation.lowInputs);
      const highBreakEvenForRanking = breakEvenFallback(highSummary.breakEvenMonths, variation.highInputs);

      const breakEvenDeltaMonths = Math.max(
        Math.abs(lowBreakEvenForRanking - baselineBreakEven),
        Math.abs(highBreakEvenForRanking - baselineBreakEven),
      );

      const expectedLossDeltaPct =
        baselineExpectedLoss > 0 ? (expectedLossDelta / baselineExpectedLoss) * 100 : 0;

      const breakEvenDeltaPct =
        baselineBreakEven > 0 ? (breakEvenDeltaMonths / baselineBreakEven) * 100 : 0;

      const impactScore = expectedLossDeltaPct * 0.7 + breakEvenDeltaPct * 0.3;

      return {
        key: variation.key,
        label: variation.label,
        inputRangeLabel: variation.inputRangeLabel,
        expectedLossDelta,
        expectedLossDeltaPct,
        breakEvenDeltaMonths,
        breakEvenDeltaPct,
        expectedLossRange: numericRange(lowExpectedLoss, highExpectedLoss),
        breakEvenRangeMonths: numericNullableRange(
          lowSummary.breakEvenMonths,
          highSummary.breakEvenMonths,
        ),
        impactScore,
      } satisfies SensitivityDriver;
    })
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, modelConfig.sensitivity.topDrivers);
}

export function buildExecutiveBrief(
  inputs: C2QModelInputs,
  summary: ExecutiveRiskSummary,
  topDrivers: SensitivityDriver[],
): string {
  const driverSummary = topDrivers
    .slice(0, 3)
    .map(
      (driver) =>
        `${driver.label} (${driver.inputRangeLabel}; expected loss Δ ${currencyFormatter.format(
          driver.expectedLossDelta,
        )})`,
    )
    .join('; ');

  const tailLabel = modelConfig.tailRisk.confidence >= 0.99 ? 'P99' : 'P95';

  return [
    'Dytallix C2Q Executive Brief',
    `Asset: ${formatAssetType(inputs.assetType)} | Value: ${currencyFormatter.format(inputs.assetValue)} | Horizon: ${inputs.riskHorizon.toFixed(1)} years`,
    `Expected loss (classical): ${currencyFormatter.format(summary.expectedLossClassical)} | Tail risk (${tailLabel}): ${currencyFormatter.format(summary.tailRiskLoss)}`,
    `Recommended posture: ${summary.recommendationLabel} | Residual exposure after mitigation: ${summary.residualExposurePct.toFixed(1)}%`,
    `Break-even: ${formatBreakEven(summary.breakEvenMonths)}`,
    `Key assumptions: ${driverSummary || 'No sensitivity drivers computed.'}`,
    `Rationale: ${summary.rationale}`,
  ].join('\n');
}
