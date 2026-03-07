// ─── Database Models ─────────────────────────────────────────────

export type UserRole = 'admin' | 'rep';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type Industry =
  | 'finserv'
  | 'healthcare'
  | 'gov_defense'
  | 'energy'
  | 'high_tech'
  | 'crypto_web3';

export type PipelineStage =
  | 'prospect'
  | 'discovery'
  | 'exposure_assessment'
  | 'poc_pilot'
  | 'proposal_sent'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export type QuantumRiskLevel = 1 | 2 | 3 | 4 | 5;

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: Industry;
  email?: string;
  linkedin?: string;
  phone?: string;
  stage: PipelineStage;
  quantum_risk: QuantumRiskLevel;
  deal_value?: number;
  assigned_to?: string; // user id
  last_contact?: string; // ISO date
  next_follow_up?: string; // ISO date
  expected_close?: string; // ISO date
  notes?: string;
  tags: string[];
  competitors: string[];
  lost_reason?: string;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface Task {
  id: string;
  title: string;
  contact_id?: string;
  assigned_to?: string; // user id
  due_date?: string; // ISO date
  priority: TaskPriority;
  completed: boolean;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

export type InteractionType =
  | 'Email'
  | 'Call'
  | 'Meeting'
  | 'LinkedIn'
  | 'Note'
  | 'Demo'
  | 'Proposal';

export interface Interaction {
  id: string;
  contact_id: string;
  type: InteractionType;
  note: string;
  logged_by?: string; // user id
  date: string; // ISO date
  created_at: string;
}

// ─── OAuth Token Storage ─────────────────────────────────────────

export type OAuthProvider = 'google' | 'linkedin';

export interface OAuthToken {
  id: string;
  user_id: string;
  provider: OAuthProvider;
  access_token: string; // encrypted
  refresh_token: string; // encrypted
  token_expiry: string; // ISO datetime
  scopes: string[];
  provider_email?: string; // e.g. the Gmail address connected
  created_at: string;
  updated_at: string;
}

// ─── Gmail / Email Models ────────────────────────────────────────

export interface EmailMessage {
  id: string;
  gmail_message_id?: string;
  contact_id?: string;
  user_id: string;
  from_address: string;
  to_address: string;
  subject: string;
  body: string;
  body_html?: string;
  thread_id?: string;
  direction: 'inbound' | 'outbound';
  read: boolean;
  starred: boolean;
  date: string;
  created_at: string;
}

// ─── Calendar Models ─────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  google_event_id?: string;
  user_id: string;
  contact_id?: string;
  title: string;
  description?: string;
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
  location?: string;
  meeting_link?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// ─── API Response Types ──────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ─── Dashboard / Analytics Types ─────────────────────────────────

export interface PipelineMetrics {
  total_pipeline_value: number;
  weighted_forecast: number;
  win_rate: number;
  avg_deal_size: number;
  deals_by_stage: Record<PipelineStage, { count: number; value: number }>;
  deals_by_industry: Record<Industry, { count: number; value: number; won: number }>;
  deals_by_risk: Record<QuantumRiskLevel, { count: number; value: number }>;
}

export interface RepPerformance {
  user_id: string;
  user_name: string;
  active_deals: number;
  pipeline_value: number;
  won_deals: number;
  open_tasks: number;
}
