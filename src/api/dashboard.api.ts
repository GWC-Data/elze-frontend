import { del, get, patch, post } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import type {
  CardDefinition,
  ColumnCatalogue,
  CreateDashboardPayload,
  CreatedDashboard,
  HydratedDashboardView,
  PreviewResult,
} from '@/types/dashboard'

export function createDashboard(payload: CreateDashboardPayload): Promise<CreatedDashboard> {
  return post<CreatedDashboard>(endpoints.dashboard.root, payload)
}

export function deleteDashboard(dashboardId: string): Promise<{ deleted: boolean; dashboardId: string }> {
  return del<{ deleted: boolean; dashboardId: string }>(endpoints.dashboard.one(dashboardId))
}

function filterParams(filters: Record<string, string[]>): Record<string, string> {
  return Object.fromEntries(Object.entries(filters).map(([id, values]) => [id, values.join(',')]))
}

export function fetchView(
  dashboardId: string,
  filters: Record<string, string[]> = {}
): Promise<HydratedDashboardView> {
  return get<HydratedDashboardView>(endpoints.dashboard.one(dashboardId), {
    params: filterParams(filters),
  })
}

export function patchCard(
  dashboardId: string,
  index: number,
  card: CardDefinition,
  filters: Record<string, string[]>
): Promise<HydratedDashboardView> {
  return patch<HydratedDashboardView>(endpoints.dashboard.config(dashboardId), { index, card, filters })
}

export function fetchColumns(dashboardId: string): Promise<ColumnCatalogue> {
  return get<ColumnCatalogue>(endpoints.dashboard.columns, { params: { dashboardId } })
}

export function previewCard(
  dashboardId: string,
  card: CardDefinition,
  filters: Record<string, string[]> = {}
): Promise<PreviewResult> {
  return post<PreviewResult>(endpoints.dashboard.preview, { card, filters, dashboardId })
}
