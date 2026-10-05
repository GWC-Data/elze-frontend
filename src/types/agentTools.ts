import type { ChartType } from "@/components/common/agent/tools/AgentChart"
import type { ReportProps } from "@/components/common/agent/tools/Report"

export type ToolTableColumn = {
  accessor_key: string
  header: string
}

export type ToolTable = {
  table_name: string
  columns: ToolTableColumn[]
  rows: Record<string, unknown>[]
}

export type ToolChartSeriesSpec = {
  dataKey: string
  fill?: string
  stroke?: string
  name?: string
}

export type ToolChart = {
  chart_name: string
  chart_type: ChartType
  chart_props: {
    data: Record<string, unknown>[] | Record<string, unknown>
    dataKey?: string
    nameKey?: string
    xAxis?: { dataKey?: string }
    yAxis?: { dataKey?: string }
    bars?: ToolChartSeriesSpec[]
    lines?: ToolChartSeriesSpec[]
    areas?: ToolChartSeriesSpec[]
  }
}

export type ToolKpiMetrics = {
  delta?: string | number
  trend?: "up" | "down" | string
  scope?: string
}

export type ToolKpi = {
  kpi_name: string
  kpi_value: string | number
  kpi_description?: string
  kpi_metrics?: ToolKpiMetrics
}

export type ToolActionType = "alert"

export type ToolAction = {
  action_label: string
  action_type: ToolActionType
}

export type ToolInsightPoint = {
  title: string
  detail: string
}

export type ToolInsight = {
  title: string
  reason: string
  points?: ToolInsightPoint[]
}

export type ToolFindingStat = {
  stat_label: string
  stat_value: string | number
  stat_trend?: "up" | "down" | "flat"
  stat_delta?: string
}

export type ToolFinding = {
  finding_title: string
  stats?: ToolFindingStat[]
  summary: string
  reason?: string
  points?: ToolInsightPoint[]
}

export type ToolEngineData = {
  kpi?: ToolKpi[]
  table?: ToolTable[]
  chart?: ToolChart[]
  report?: ReportProps[]
  action?: ToolAction[]
  insight?: ToolInsight[]
  finding?: ToolFinding[]
  text_data?: string
}
