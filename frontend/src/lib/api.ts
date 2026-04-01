import type {
  User,
  Opportunity,
  Document,
  Comment,
  ProgressNote,
  VoteResponse,
  ChatMessage,
  ChatResponse,
} from "@/types";

// ── Helpers ──────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.error ?? res.statusText,
      body.detail,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ── Auth ─────────────────────────────────────────────

export async function login(
  username: string,
  password: string,
): Promise<User> {
  return request<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST" });
}

export async function me(): Promise<User> {
  return request<User>("/api/auth/me");
}

// ── Opportunities ────────────────────────────────────

export interface OpportunityFilters {
  status?: string;
  assigned_to?: number;
  property_type?: string;
  city?: string;
}

export async function listOpportunities(
  filters?: OpportunityFilters,
): Promise<Opportunity[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
  }
  const qs = params.toString();
  return request<Opportunity[]>(
    `/api/opportunities${qs ? `?${qs}` : ""}`,
  );
}

export async function getOpportunity(
  id: number,
): Promise<Opportunity> {
  return request<Opportunity>(`/api/opportunities/${id}`);
}

export async function updateOpportunity(
  id: number,
  data: Partial<Opportunity>,
): Promise<Opportunity> {
  return request<Opportunity>(`/api/opportunities/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function assignOpportunity(
  id: number,
  userId: number,
): Promise<Opportunity> {
  return request<Opportunity>(`/api/opportunities/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ assigned_to: userId }),
  });
}

export async function updateOpportunityStatus(
  id: number,
  status: string,
): Promise<Opportunity> {
  return request<Opportunity>(`/api/opportunities/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ── Documents ────────────────────────────────────────

export async function uploadDocuments(
  files: FileList | File[],
): Promise<{ opportunity: Opportunity; documents: Document[] }> {
  // Backend accepts one file at a time — upload the first file
  const file = Array.from(files)[0];
  if (!file) throw new ApiError(400, "No file selected");

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/documents/upload?parse=true", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.error ?? body.detail ?? res.statusText,
      body.detail,
    );
  }

  const data = await res.json();
  return {
    opportunity: data.opportunity,
    documents: [data.document],
  };
}

export async function listDocuments(
  opportunityId?: number,
): Promise<Document[]> {
  const qs = opportunityId
    ? `?opportunity_id=${opportunityId}`
    : "";
  return request<Document[]>(`/api/documents${qs}`);
}

export async function getDocument(id: number): Promise<Document> {
  return request<Document>(`/api/documents/${id}`);
}

export function documentDownloadUrl(id: number): string {
  return `/api/documents/${id}/download`;
}

// ── Votes ────────────────────────────────────────────

export async function castVote(
  opportunityId: number,
  vote: 1 | -1,
): Promise<VoteResponse> {
  return request<VoteResponse>(
    `/api/opportunities/${opportunityId}/vote`,
    {
      method: "POST",
      body: JSON.stringify({ vote }),
    },
  );
}

// ── Comments ─────────────────────────────────────────

export async function listComments(
  opportunityId: number,
): Promise<Comment[]> {
  return request<Comment[]>(
    `/api/opportunities/${opportunityId}/comments`,
  );
}

export async function addComment(
  opportunityId: number,
  content: string,
): Promise<Comment> {
  return request<Comment>(
    `/api/opportunities/${opportunityId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
}

// ── Progress Notes ───────────────────────────────────

export async function listProgress(
  opportunityId: number,
): Promise<ProgressNote[]> {
  return request<ProgressNote[]>(
    `/api/opportunities/${opportunityId}/progress`,
  );
}

export async function addProgress(
  opportunityId: number,
  note: string,
): Promise<ProgressNote> {
  return request<ProgressNote>(
    `/api/opportunities/${opportunityId}/progress`,
    {
      method: "POST",
      body: JSON.stringify({ note }),
    },
  );
}

// ── Chat ─────────────────────────────────────────────

export async function sendChat(
  message: string,
): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function chatHistory(): Promise<ChatMessage[]> {
  return request<ChatMessage[]>("/api/chat/history");
}
