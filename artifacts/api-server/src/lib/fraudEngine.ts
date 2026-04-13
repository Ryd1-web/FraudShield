import { logger } from "./logger";

export interface TransactionInput {
  id?: string;
  type: string;
  amount: number;
  currency?: string;
  senderPhone: string;
  recipientPhone?: string;
  senderLocation: string;
  deviceId: string;
  accountAge?: number;
  previousTxCount?: number;
  hourOfDay?: number;
  isNewDevice?: boolean;
  distanceFromHome?: number;
  timestamp?: string;
}

export interface FeatureImportance {
  feature: string;
  value: number;
  importance: number;
  direction: "increases_risk" | "decreases_risk" | "neutral";
  description: string;
}

export interface FraudAnalysis {
  riskScore: number;
  isFraud: boolean;
  fraudLabel: "clean" | "suspicious" | "fraudulent";
  triggeredRules: string[];
  featureImportance: FeatureImportance[];
  explanation: string;
  modelUsed: string;
  confidence: number;
}

export interface ModelConfig {
  activeModels: {
    ruleBased: boolean;
    anomalyDetection: boolean;
    logisticRegression: boolean;
  };
  thresholds: {
    suspicious: number;
    fraudulent: number;
    block: number;
  };
  weights: {
    ruleBased: number;
    anomalyDetection: number;
    logisticRegression: number;
  };
  featureFlags: {
    velocityCheck: boolean;
    geolocationCheck: boolean;
    deviceFingerprint: boolean;
    accountAgeCheck: boolean;
    amountAnomaly: boolean;
    timePattern: boolean;
  };
}

export const DEFAULT_CONFIG: ModelConfig = {
  activeModels: {
    ruleBased: true,
    anomalyDetection: true,
    logisticRegression: true,
  },
  thresholds: {
    suspicious: 40,
    fraudulent: 70,
    block: 85,
  },
  weights: {
    ruleBased: 0.35,
    anomalyDetection: 0.30,
    logisticRegression: 0.35,
  },
  featureFlags: {
    velocityCheck: true,
    geolocationCheck: true,
    deviceFingerprint: true,
    accountAgeCheck: true,
    amountAnomaly: true,
    timePattern: true,
  },
};

// Nigerian mobile money transaction context
const NIGERIAN_CITIES = [
  "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City",
  "Maiduguri", "Zaria", " Jos", "Enugu", "Abeokuta", "Onitsha",
  "Warri", "Sokoto", "Ilorin", "Aba", "Asaba", "Calabar"
];

const HIGH_RISK_LOCATIONS = ["Maiduguri", "Sokoto", "Zaria", "Unknown", "Abroad"];
const AGENT_HIGH_RISK_TYPES = ["agent_withdrawal", "agent_deposit"];

// Typical Nigerian mobile money thresholds (in NGN)
const TYPICAL_SMALL_TX = 5000;
const TYPICAL_MEDIUM_TX = 50000;
const TYPICAL_LARGE_TX = 200000;
const VERY_LARGE_TX = 500000;

export function extractFeatures(tx: TransactionInput, config: ModelConfig) {
  const hourOfDay = tx.hourOfDay ?? new Date().getHours();
  const accountAge = tx.accountAge ?? 365;
  const previousTxCount = tx.previousTxCount ?? 50;
  const isNewDevice = tx.isNewDevice ?? false;
  const distanceFromHome = tx.distanceFromHome ?? 0;

  // Velocity feature: unusual transaction frequency
  const velocityScore = config.featureFlags.velocityCheck
    ? Math.min(100, (previousTxCount > 20 ? (previousTxCount - 20) * 2 : 0))
    : 0;

  // Amount anomaly
  const amountScore = config.featureFlags.amountAnomaly
    ? (() => {
        if (tx.amount > VERY_LARGE_TX) return 85;
        if (tx.amount > TYPICAL_LARGE_TX) return 60;
        if (tx.amount > TYPICAL_MEDIUM_TX) return 30;
        if (tx.amount < TYPICAL_SMALL_TX) return 5;
        return 10;
      })()
    : 0;

  // Geolocation deviation
  const geoScore = config.featureFlags.geolocationCheck
    ? (() => {
        if (HIGH_RISK_LOCATIONS.includes(tx.senderLocation)) return 70;
        if (distanceFromHome > 500) return 60;
        if (distanceFromHome > 200) return 35;
        return 5;
      })()
    : 0;

  // Account age factor - new accounts are higher risk
  const accountAgeScore = config.featureFlags.accountAgeCheck
    ? (() => {
        if (accountAge < 7) return 80;
        if (accountAge < 30) return 55;
        if (accountAge < 90) return 30;
        if (accountAge < 180) return 15;
        return 5;
      })()
    : 0;

  // Device fingerprint - new/changed device
  const deviceScore = config.featureFlags.deviceFingerprint
    ? (isNewDevice ? 65 : 5)
    : 0;

  // Time pattern - transactions in unusual hours (midnight to 5am)
  const timeScore = config.featureFlags.timePattern
    ? (hourOfDay >= 0 && hourOfDay < 5 ? 55 : hourOfDay >= 23 ? 30 : 5)
    : 0;

  // Transaction type risk
  const typeScore = AGENT_HIGH_RISK_TYPES.includes(tx.type) ? 25 : 5;

  return {
    velocityScore,
    amountScore,
    geoScore,
    accountAgeScore,
    deviceScore,
    timeScore,
    typeScore,
    hourOfDay,
    accountAge,
    previousTxCount,
    isNewDevice,
    distanceFromHome,
  };
}

function ruleBasedScore(tx: TransactionInput, features: ReturnType<typeof extractFeatures>): {
  score: number;
  triggeredRules: string[];
} {
  const rules: { name: string; score: number; triggered: boolean }[] = [
    {
      name: "Large amount transaction (>NGN 500,000)",
      score: 35,
      triggered: tx.amount > VERY_LARGE_TX,
    },
    {
      name: "High-risk geolocation detected",
      score: 30,
      triggered: HIGH_RISK_LOCATIONS.includes(tx.senderLocation),
    },
    {
      name: "New account (< 7 days old)",
      score: 40,
      triggered: features.accountAge < 7,
    },
    {
      name: "Recently created account (< 30 days)",
      score: 25,
      triggered: features.accountAge >= 7 && features.accountAge < 30,
    },
    {
      name: "New or unrecognized device",
      score: 30,
      triggered: features.isNewDevice,
    },
    {
      name: "Unusual transaction time (00:00-05:00)",
      score: 20,
      triggered: features.hourOfDay >= 0 && features.hourOfDay < 5,
    },
    {
      name: "High transaction velocity (>30 prior transactions)",
      score: 25,
      triggered: features.previousTxCount > 30,
    },
    {
      name: "Agent transaction with large amount",
      score: 30,
      triggered: AGENT_HIGH_RISK_TYPES.includes(tx.type) && tx.amount > TYPICAL_MEDIUM_TX,
    },
    {
      name: "Geographic displacement (>500km from home)",
      score: 35,
      triggered: features.distanceFromHome > 500,
    },
    {
      name: "Very high transaction velocity (>50 prior transactions)",
      score: 20,
      triggered: features.previousTxCount > 50,
    },
  ];

  const triggeredRules = rules.filter(r => r.triggered);
  const totalScore = triggeredRules.reduce((sum, r) => sum + r.score, 0);

  return {
    score: Math.min(100, totalScore),
    triggeredRules: triggeredRules.map(r => r.name),
  };
}

function anomalyDetectionScore(tx: TransactionInput, features: ReturnType<typeof extractFeatures>): number {
  // Isolation forest approximation — combines multiple features using weighted scoring
  const featureScores = [
    features.velocityScore * 0.25,
    features.amountScore * 0.25,
    features.geoScore * 0.20,
    features.accountAgeScore * 0.15,
    features.deviceScore * 0.10,
    features.timeScore * 0.05,
  ];

  const baseScore = featureScores.reduce((sum, s) => sum + s, 0);

  // Add interaction effects
  let interactionBonus = 0;
  if (features.isNewDevice && features.accountAge < 30) interactionBonus += 20;
  if (tx.amount > TYPICAL_LARGE_TX && features.hourOfDay < 5) interactionBonus += 15;
  if (HIGH_RISK_LOCATIONS.includes(tx.senderLocation) && features.isNewDevice) interactionBonus += 25;

  return Math.min(100, baseScore + interactionBonus);
}

function logisticRegressionScore(tx: TransactionInput, features: ReturnType<typeof extractFeatures>): number {
  // Simulated logistic regression with trained coefficients for Nigerian mobile money context
  const intercept = -2.8;
  const coefficients = {
    largeAmount: 1.8,       // >NGN 200k
    veryLargeAmount: 2.5,   // >NGN 500k
    newAccount: 3.2,        // < 7 days
    youngAccount: 2.1,      // < 30 days
    newDevice: 2.4,
    nightTime: 1.5,
    highRiskLocation: 2.0,
    highVelocity: 1.9,
    agentTx: 0.8,
    highDistance: 1.7,
  };

  const logOdds =
    intercept +
    (tx.amount > VERY_LARGE_TX ? coefficients.veryLargeAmount : 0) +
    (tx.amount > TYPICAL_LARGE_TX && tx.amount <= VERY_LARGE_TX ? coefficients.largeAmount : 0) +
    (features.accountAge < 7 ? coefficients.newAccount : 0) +
    (features.accountAge >= 7 && features.accountAge < 30 ? coefficients.youngAccount : 0) +
    (features.isNewDevice ? coefficients.newDevice : 0) +
    (features.hourOfDay >= 0 && features.hourOfDay < 5 ? coefficients.nightTime : 0) +
    (HIGH_RISK_LOCATIONS.includes(tx.senderLocation) ? coefficients.highRiskLocation : 0) +
    (features.previousTxCount > 30 ? coefficients.highVelocity : 0) +
    (AGENT_HIGH_RISK_TYPES.includes(tx.type) ? coefficients.agentTx : 0) +
    (features.distanceFromHome > 500 ? coefficients.highDistance : 0);

  // Sigmoid function → probability → 0-100 score
  const probability = 1 / (1 + Math.exp(-logOdds));
  return Math.round(probability * 100);
}

function buildFeatureImportance(
  tx: TransactionInput,
  features: ReturnType<typeof extractFeatures>,
): FeatureImportance[] {
  const items: FeatureImportance[] = [
    {
      feature: "Transaction Amount",
      value: tx.amount,
      importance: features.amountScore / 100,
      direction: features.amountScore > 30 ? "increases_risk" : "neutral",
      description: `NGN ${tx.amount.toLocaleString()} — ${
        tx.amount > VERY_LARGE_TX
          ? "Extremely large transaction, high risk"
          : tx.amount > TYPICAL_LARGE_TX
          ? "Above typical threshold"
          : "Within normal range"
      }`,
    },
    {
      feature: "Account Age",
      value: features.accountAge,
      importance: features.accountAgeScore / 100,
      direction: features.accountAgeScore > 30 ? "increases_risk" : "decreases_risk",
      description: `Account is ${features.accountAge} days old — ${
        features.accountAge < 7
          ? "Very new account, extremely high risk"
          : features.accountAge < 30
          ? "Recently created, elevated risk"
          : "Established account"
      }`,
    },
    {
      feature: "Device Recognition",
      value: features.isNewDevice ? 1 : 0,
      importance: features.deviceScore / 100,
      direction: features.isNewDevice ? "increases_risk" : "decreases_risk",
      description: features.isNewDevice
        ? "Transaction from an unrecognized device — suspicious"
        : "Known device fingerprint",
    },
    {
      feature: "Geographic Location",
      value: features.geoScore,
      importance: features.geoScore / 100,
      direction: features.geoScore > 30 ? "increases_risk" : "neutral",
      description: `Location: ${tx.senderLocation} — ${
        HIGH_RISK_LOCATIONS.includes(tx.senderLocation)
          ? "High-risk location detected"
          : features.distanceFromHome > 500
          ? "Far from home location"
          : "Normal geographic pattern"
      }`,
    },
    {
      feature: "Transaction Velocity",
      value: features.previousTxCount,
      importance: features.velocityScore / 100,
      direction: features.velocityScore > 30 ? "increases_risk" : "neutral",
      description: `${features.previousTxCount} prior transactions — ${
        features.previousTxCount > 50
          ? "Abnormally high frequency"
          : features.previousTxCount > 30
          ? "Above average velocity"
          : "Normal frequency"
      }`,
    },
    {
      feature: "Time Pattern",
      value: features.hourOfDay,
      importance: features.timeScore / 100,
      direction: features.timeScore > 20 ? "increases_risk" : "neutral",
      description: `Hour: ${features.hourOfDay}:00 — ${
        features.hourOfDay >= 0 && features.hourOfDay < 5
          ? "Late night transaction, unusual pattern"
          : "Normal business hours"
      }`,
    },
  ];

  return items.sort((a, b) => b.importance - a.importance);
}

export function analyzeFraud(tx: TransactionInput, config: ModelConfig = DEFAULT_CONFIG): FraudAnalysis {
  const features = extractFeatures(tx, config);

  let ruleScore = 0;
  let anomalyScore = 0;
  let lrScore = 0;
  const triggeredRules: string[] = [];
  const modelsUsed: string[] = [];

  if (config.activeModels.ruleBased) {
    const rb = ruleBasedScore(tx, features);
    ruleScore = rb.score;
    triggeredRules.push(...rb.triggeredRules);
    modelsUsed.push("Rule-Based");
  }

  if (config.activeModels.anomalyDetection) {
    anomalyScore = anomalyDetectionScore(tx, features);
    modelsUsed.push("Anomaly Detection");
  }

  if (config.activeModels.logisticRegression) {
    lrScore = logisticRegressionScore(tx, features);
    modelsUsed.push("Logistic Regression");
  }

  // Normalize weights
  const totalWeight =
    (config.activeModels.ruleBased ? config.weights.ruleBased : 0) +
    (config.activeModels.anomalyDetection ? config.weights.anomalyDetection : 0) +
    (config.activeModels.logisticRegression ? config.weights.logisticRegression : 0);

  const normalizedWeights = {
    ruleBased: totalWeight > 0 ? config.weights.ruleBased / totalWeight : 0,
    anomalyDetection: totalWeight > 0 ? config.weights.anomalyDetection / totalWeight : 0,
    logisticRegression: totalWeight > 0 ? config.weights.logisticRegression / totalWeight : 0,
  };

  const riskScore = Math.round(
    (config.activeModels.ruleBased ? ruleScore * normalizedWeights.ruleBased : 0) +
    (config.activeModels.anomalyDetection ? anomalyScore * normalizedWeights.anomalyDetection : 0) +
    (config.activeModels.logisticRegression ? lrScore * normalizedWeights.logisticRegression : 0),
  );

  const fraudLabel: "clean" | "suspicious" | "fraudulent" =
    riskScore >= config.thresholds.fraudulent
      ? "fraudulent"
      : riskScore >= config.thresholds.suspicious
      ? "suspicious"
      : "clean";

  const isFraud = fraudLabel === "fraudulent";

  const featureImportance = buildFeatureImportance(tx, features);

  // Build explanation
  const topFeatures = featureImportance.filter(f => f.direction === "increases_risk").slice(0, 3);
  let explanation = "";

  if (fraudLabel === "clean") {
    explanation = `Transaction appears legitimate. Risk score is ${riskScore}/100, within normal parameters for ${tx.senderLocation}-based ${tx.type.replace(/_/g, " ")} transactions.`;
  } else if (fraudLabel === "suspicious") {
    explanation = `Transaction flagged as suspicious (score: ${riskScore}/100). ${
      topFeatures.length > 0
        ? `Key risk factors: ${topFeatures.map(f => f.feature.toLowerCase()).join(", ")}.`
        : ""
    } Recommend secondary verification.`;
  } else {
    explanation = `HIGH RISK — Transaction likely fraudulent (score: ${riskScore}/100). ${
      triggeredRules.length > 0
        ? `${triggeredRules.length} rule(s) triggered: ${triggeredRules.slice(0, 2).join("; ")}.`
        : ""
    } ${
      topFeatures.length > 0
        ? `Primary risk drivers: ${topFeatures.map(f => f.feature.toLowerCase()).join(", ")}.`
        : ""
    } Recommend immediate block and investigation.`;
  }

  const confidence = Math.min(0.99, 0.5 + Math.abs(riskScore - 50) / 100);

  return {
    riskScore,
    isFraud,
    fraudLabel,
    triggeredRules,
    featureImportance,
    explanation,
    modelUsed: modelsUsed.join(" + "),
    confidence,
  };
}
