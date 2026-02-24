/**
 * Profile Store
 * Caches the regions list so it is only fetched once across the app.
 * Villages are returned directly (not cached globally, as they depend on the selected region).
 */
import { create } from 'zustand'
import * as profileAPI from '../../lib/api/profile.api'
import type { Region, Village } from '../../lib/api/profile.api'

interface ProfileState {
  regions: Region[]
  loadingRegions: boolean

  /** Fetch regions once — subsequent calls are no-ops if already loaded. */
  fetchRegions: () => Promise<void>

  /** Fetch villages for a given region. Always returns fresh data. */
  fetchVillagesByRegion: (regionId: string) => Promise<Village[]>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  regions: [],
  loadingRegions: false,

  fetchRegions: async () => {
    if (get().regions.length > 0 || get().loadingRegions) return
    set({ loadingRegions: true })
    try {
      const regions = await profileAPI.getRegionsAPI()
      set({ regions, loadingRegions: false })
    } catch {
      set({ loadingRegions: false })
    }
  },

  fetchVillagesByRegion: async (regionId: string) => {
    return profileAPI.getVillagesByRegionAPI(regionId)
  },
}))
