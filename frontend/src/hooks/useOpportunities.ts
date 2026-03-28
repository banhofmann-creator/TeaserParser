"use client";

import { useState, useEffect, useCallback } from "react";
import type { Opportunity } from "@/types";
import * as api from "@/lib/api";
import type { OpportunityFilters } from "@/lib/api";

interface UseOpportunitiesReturn {
  opportunities: Opportunity[];
  loading: boolean;
  error: string | null;
  filters: OpportunityFilters;
  setFilters: (f: OpportunityFilters) => void;
  refetch: () => Promise<void>;
}

export function useOpportunities(): UseOpportunitiesReturn {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OpportunityFilters>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listOpportunities(filters);
      setOpportunities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { opportunities, loading, error, filters, setFilters, refetch: fetchData };
}
