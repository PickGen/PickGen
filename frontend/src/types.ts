export interface User {
  id: string;
  email: string;
  credits: number;
  plan: string;
  createdAt: string;
}

export type ModeId = 'draft' | 'quality' | 'text';

export interface ModeSpec {
  id: ModeId;
  label: string;
  cost: number;
  model: string;
  approxCostUsd: number;
}

export interface StyleSpec {
  id: string;
  label: string;
}

export interface FormatSpec {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface Package {
  id: string;
  line: 'standard' | 'quality';
  credits: number;
  priceUsd: number;
  label: string;
  paddlePriceId?: string;
}

export interface AppConfig {
  modes: ModeSpec[];
  defaultMode: ModeId;
  styles: StyleSpec[];
  formats: FormatSpec[];
  packages: Package[];
  freeSignupCredits: number;
  freeDailyDrafts: number;
  paymentProvider: string;
  aiProvider: string;
  paddle?: { clientToken: string; env: string };
}

export interface Generation {
  id: string;
  prompt: string;
  mode: string;
  style: string;
  format: string;
  seed: number | null;
  imageUrl: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  provider: string;
  amount: number;
  credits: number;
  type: string;
  status: string;
  createdAt: string;
}
