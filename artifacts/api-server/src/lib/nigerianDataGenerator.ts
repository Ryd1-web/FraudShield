import { v4 as uuidv4 } from "uuid";
import { TransactionInput } from "./fraudEngine";

const NIGERIAN_CITIES = [
  "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City",
  "Maiduguri", "Zaria", "Jos", "Enugu", "Abeokuta", "Onitsha",
  "Warri", "Sokoto", "Ilorin", "Aba", "Asaba", "Calabar", "Uyo", "Akure"
];

const HIGH_RISK_CITIES = ["Maiduguri", "Sokoto", "Zaria"];

const TRANSACTION_TYPES = [
  "send", "receive", "withdraw", "agent_deposit", "agent_withdrawal", "airtime", "bill_payment"
];

const NETWORK_OPERATORS = ["MTN", "GLO", "AIRTEL", "9MOBILE"];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNigerianPhone(): string {
  const operator = randomChoice(NETWORK_OPERATORS);
  const prefixes: Record<string, string[]> = {
    MTN: ["0803", "0806", "0810", "0813", "0814", "0816", "0903", "0906"],
    GLO: ["0805", "0807", "0811", "0815", "0905"],
    AIRTEL: ["0802", "0808", "0812", "0701", "0708", "0902"],
    "9MOBILE": ["0809", "0818", "0819", "0909"],
  };
  const prefix = randomChoice(prefixes[operator]);
  const number = String(randomInt(1000000, 9999999));
  return `${prefix}${number}`;
}

function generateDeviceId(): string {
  return `DEV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

export interface GeneratorConfig {
  count: number;
  fraudRate?: number;
  location?: string;
  amountRange?: { min: number; max: number };
  transactionTypes?: string[];
  includeAgentTransactions?: boolean;
}

export function generateSyntheticTransaction(
  config: GeneratorConfig,
  forcefraud?: boolean
): TransactionInput {
  const isFraudTarget = forcefraud ?? Math.random() < (config.fraudRate ?? 0.15);
  const location = config.location || randomChoice(NIGERIAN_CITIES);

  const amountMin = config.amountRange?.min ?? 500;
  const amountMax = config.amountRange?.max ?? 200000;

  // Fraudulent transactions tend to be larger
  const amount = isFraudTarget
    ? randomFloat(Math.max(amountMin, 100000), Math.max(amountMax, 500000))
    : randomFloat(amountMin, Math.min(amountMax, 100000));

  const availableTypes = config.transactionTypes?.length
    ? config.transactionTypes
    : config.includeAgentTransactions === false
    ? ["send", "receive", "withdraw", "airtime", "bill_payment"]
    : TRANSACTION_TYPES;

  const type = randomChoice(availableTypes);

  // Fraud characteristics
  const accountAge = isFraudTarget
    ? Math.random() < 0.6 ? randomInt(1, 14) : randomInt(15, 60)
    : randomInt(30, 1800);

  const previousTxCount = isFraudTarget
    ? Math.random() < 0.5 ? randomInt(40, 100) : randomInt(0, 5)
    : randomInt(10, 50);

  const isNewDevice = isFraudTarget ? Math.random() < 0.7 : Math.random() < 0.05;

  const hourOfDay = isFraudTarget
    ? Math.random() < 0.5 ? randomInt(0, 4) : randomInt(0, 23)
    : randomInt(7, 22);

  const distanceFromHome = isFraudTarget
    ? Math.random() < 0.4 ? randomFloat(300, 1500) : randomFloat(0, 100)
    : randomFloat(0, 50);

  const fraudLocation = isFraudTarget && Math.random() < 0.3
    ? randomChoice(HIGH_RISK_CITIES)
    : location;

  const now = new Date();
  now.setHours(hourOfDay, randomInt(0, 59), 0, 0);

  return {
    id: `TXN-${uuidv4().substring(0, 8).toUpperCase()}`,
    type,
    amount: Math.round(amount),
    currency: "NGN",
    senderPhone: generateNigerianPhone(),
    recipientPhone: ["send", "receive", "airtime"].includes(type) ? generateNigerianPhone() : undefined,
    senderLocation: fraudLocation,
    deviceId: generateDeviceId(),
    timestamp: now.toISOString(),
    accountAge,
    previousTxCount,
    hourOfDay,
    isNewDevice,
    distanceFromHome,
  };
}

export function generateBatch(config: GeneratorConfig): TransactionInput[] {
  const transactions: TransactionInput[] = [];
  const fraudCount = Math.round(config.count * (config.fraudRate ?? 0.15));

  for (let i = 0; i < config.count; i++) {
    const isFraud = i < fraudCount;
    transactions.push(generateSyntheticTransaction(config, isFraud));
  }

  // Shuffle to mix fraud and clean transactions
  return transactions.sort(() => Math.random() - 0.5);
}
