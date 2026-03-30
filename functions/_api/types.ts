export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  REMOVEBG_API_KEY: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_MODE: string;
  PAYPAL_WEBHOOK_ID?: string;
  FRONTEND_URL: string;
  JWT_SECRET: string;
}

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string;
  plan: 'free' | 'pro' | 'premium';
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface EditHistory {
  id: string;
  user_id: string;
  thumbnail: string;
  original_name: string;
  original_size: number;
  operations: string;
  bg_color: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  billing_cycle: string;
  paypal_subscription_id: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface CreditPack {
  id: string;
  user_id: string;
  credits: number;
  credits_remaining: number;
  price_cents: number;
  paypal_order_id: string;
  expires_at: string;
  created_at: string;
}

export interface CreditUsage {
  id: string;
  user_id: string;
  action: string;
  source: string;
  cost: number;
  created_at: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  scope: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  plan: string;
  iat: number;
  exp: number;
}

export interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
  summary: string;
  create_time: string;
}

export const PLAN_CREDITS: Record<string, number> = {
  free: 3,
  pro: 50,
  premium: 200,
};

export const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  pro: { monthly: 990, yearly: 9480 },
  premium: { monthly: 2490, yearly: 23880 },
};

export const CREDIT_PACKS = [
  { id: 'pack_10', credits: 10, price_cents: 290, label: '10 Credits' },
  { id: 'pack_50', credits: 50, price_cents: 990, label: '50 Credits' },
  { id: 'pack_200', credits: 200, price_cents: 2990, label: '200 Credits' },
];
