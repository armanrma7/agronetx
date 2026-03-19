/**
 * React Query hooks for Regions / Villages (profile location data).
 * Regions rarely change → staleTime: Infinity.
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/queries/queryKeys'
import * as profileAPI from '../lib/api/profile.api'

// ─── Regions ─────────────────────────────────────────────────────────────────

export function useRegions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.regions.list(),
    queryFn: () => profileAPI.getRegionsAPI(),
    enabled,
    staleTime: Infinity, // region list doesn't change at runtime
    gcTime: Infinity,
  })
}

// ─── Villages by region ───────────────────────────────────────────────────────

export function useVillagesByRegion(regionId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.regions.villages(regionId ?? ''),
    queryFn: () => profileAPI.getVillagesByRegionAPI(regionId!),
    enabled: enabled && !!regionId,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
