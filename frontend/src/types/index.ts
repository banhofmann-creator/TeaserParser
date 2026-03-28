// ── User ──────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  display_name: string | null;
  role: "admin" | "user";
}

// ── Opportunity ──────────────────────────────────────
export type OpportunityStatus =
  | "new"
  | "active"
  | "inactive"
  | "completed"
  | "cancelled";

export interface Opportunity {
  id: number;
  property_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  asking_price: number | null;
  property_type: string | null;
  size_sqft: number | null;
  year_built: number | null;
  cap_rate: number | null;
  noi: number | null;
  occupancy_rate: number | null;
  rent_roll_summary: string | null;
  debt_terms: string | null;
  irr_projection: number | null;
  seller_info: string | null;
  status: OpportunityStatus;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  vote_score: number;
  vote_count: number;
  documents: Document[];
}

// ── Document ─────────────────────────────────────────
export interface Document {
  id: number;
  opportunity_id: number | null;
  stored_filename: string;
  original_filename: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: number | null;
  uploaded_at: string;
}

// ── Comment ──────────────────────────────────────────
export interface Comment {
  id: number;
  opportunity_id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string;
}

// ── Progress Note ────────────────────────────────────
export interface ProgressNote {
  id: number;
  opportunity_id: number;
  user_id: number;
  username: string;
  note: string;
  created_at: string;
}

// ── Vote ─────────────────────────────────────────────
export interface VoteResponse {
  vote_score: number;
  vote_count: number;
  user_vote: 1 | -1 | null;
}

// ── Chat ─────────────────────────────────────────────
export interface ChatMessage {
  id: number;
  user_id: number;
  role: "user" | "assistant";
  content: string;
  actions: ChatAction[] | null;
  created_at: string;
}

export interface ChatAction {
  action: string;
  opportunity_id?: number;
  status?: string;
  assigned_to?: string;
  [key: string]: unknown;
}

export interface ChatResponse {
  message: string;
  actions: ChatAction[] | null;
}

// ── API Error ────────────────────────────────────────
export interface ApiError {
  error: string;
  detail?: string;
}

// ── Navigation ───────────────────────────────────────
export type ViewId = "map" | "table" | "dashboard" | "documents" | "upload";
