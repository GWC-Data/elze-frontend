import type { ReactNode } from "react"
import { createColumnHelper } from "@tanstack/react-table"
import { Bell, ListChecks } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/workbench/button"
import { KpiCard, type KpiCardProps } from "@/components/common/agent/tools/AgentKpiCard"
import { DataTable, type GenericTableFeatures } from "@/components/common/agent/tools/AgentDataTable"
import { Chart, type ChartSeries } from "@/components/common/agent/tools/AgentChart"
import { Report } from "@/components/common/agent/tools/Report"
import { MarkdownText } from "@/components/common/agent/tools/MarkdownText"
import { InsightList } from "@/components/common/agent/tools/InsightCard"
import { FindingList } from "@/components/common/agent/tools/FindingCard"
import {
  parseRowMetadata,
  rowsHaveMetadata,
  TableActionsCell,
} from "@/components/common/agent/tools/TableActionsCell"
import type {
  ToolAction,
  ToolChart,
  ToolEngineData,
  ToolKpi,
  ToolTableColumn,
} from "@/types/agentTools"

function hasRenderableContent(data: ToolEngineData): boolean {
  return (
    Boolean(data.kpi?.length) ||
    Boolean(data.table?.length) ||
    Boolean(data.chart?.length) ||
    Boolean(data.report?.length) ||
    Boolean(data.action?.length) ||
    Boolean(data.insight?.length) ||
    Boolean(data.finding?.length) ||
    Boolean(data.text_data?.trim())
  )
}

function dedupeActions(actions: ToolAction[] | undefined): ToolAction[] | undefined {
  if (!actions || actions.length === 0) return actions
  const seen = new Set<string>()
  const deduped: ToolAction[] = []
  for (const action of actions) {
    if (seen.has(action.action_label)) continue
    seen.add(action.action_label)
    deduped.push(action)
  }
  return deduped
}

export function parseToolEngineData(text: string): ToolEngineData | null {
  try {
    const data = JSON.parse(text) as ToolEngineData
    if (!hasRenderableContent(data)) return null
    return { ...data, action: dedupeActions(data.action) }
  } catch {
    return null
  }
}

export function buildChartSeries(
  chartProps: ToolChart["chart_props"]
): ChartSeries[] | undefined {
  const specs = chartProps.bars ?? chartProps.lines ?? chartProps.areas
  if (!specs?.length) return undefined

  return specs.map((spec) => ({
    key: spec.dataKey,
    label: spec.name,
    color: spec.fill ?? spec.stroke,
  }))
}

export function normalizeChartData(
  data: ToolChart["chart_props"]["data"]
): Record<string, unknown>[] {
  return Array.isArray(data) ? data : [data]
}

const KPI_JARGON_PATTERN = /\b(distinct|aggregate(?:d)?|normalized to|grouped? by)\b\s*/gi

function sanitizeKpiDescription(description: string | undefined): string | undefined {
  if (!description) return description
  const cleaned = description.replace(KPI_JARGON_PATTERN, "").replace(/\s{2,}/g, " ").trim()
  if (!cleaned) return description
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function mapKpiToCardProps(kpi: ToolKpi): KpiCardProps {
  const metrics = kpi.kpi_metrics
  let metric: string | undefined

  if (metrics?.delta !== undefined && metrics?.delta !== null && metrics.delta !== "") {
    const deltaText = String(metrics.delta)
    const isSigned = deltaText.startsWith("+") || deltaText.startsWith("-")
    const sign = isSigned ? "" : metrics.trend === "down" ? "-" : "+"
    metric = `${sign}${deltaText}`
  }

  return {
    Kpi_Name: kpi.kpi_name,
    Kpi_Value: kpi.kpi_value,
    Kpi_Desc: sanitizeKpiDescription(kpi.kpi_description),
    Kpi_Metric: metric,
  }
}

const columnHelper = createColumnHelper<GenericTableFeatures, Record<string, unknown>>()

const MARKDOWN_LINK_RE = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/
const BARE_URL_RE = /^https?:\/\/\S+$/

function renderCellValue(value: unknown): ReactNode {
  if (value === null || value === undefined) return ""
  const text = String(value)

  const markdownMatch = text.match(MARKDOWN_LINK_RE)
  if (markdownMatch) {
    const [, label, url] = markdownMatch
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-link underline underline-offset-2"
      >
        {label}
      </a>
    )
  }

  if (BARE_URL_RE.test(text)) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-link underline underline-offset-2"
      >
        {text}
      </a>
    )
  }

  return text
}

function buildTableColumns(
  columns: ToolTableColumn[],
  rows: Record<string, unknown>[],
  tableName: string
) {
  const dataColumns = columns.map((column) =>
    columnHelper.accessor(column.accessor_key, {
      header: column.header,
      cell: (info) => renderCellValue(info.getValue()),
    })
  )

  if (!rowsHaveMetadata(rows)) return dataColumns

  return [
    ...dataColumns,
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <TableActionsCell
          metadata={parseRowMetadata(info.row.original.metadata)}
          title={tableName}
        />
      ),
    }),
  ]
}

export type ToolEngineProps = {
  data: ToolEngineData
}

export function ToolEngine({ data }: ToolEngineProps) {
  if (!hasRenderableContent(data)) return null

  return (
    <div className="flex w-full flex-col gap-4">
      {Boolean(data.kpi?.length) && (
        <div
          className={cn(
            "grid gap-3",
            data.kpi!.length === 1 && "grid-cols-1",
            data.kpi!.length === 2 && "grid-cols-2",
            data.kpi!.length >= 3 && "grid-cols-2 sm:grid-cols-3"
          )}
        >
          {data.kpi!.map((kpi, index) => (
            <KpiCard
              key={`${kpi.kpi_name}-${index}`}
              {...mapKpiToCardProps(kpi)}
              index={index}
              large={data.kpi!.length === 1}
            />
          ))}
        </div>
      )}

      {data.chart?.map((chart, index) => (
        <div
          key={`${chart.chart_name}-${index}`}
          className="rounded-xl border bg-transparent p-4"
        >
          <p className="mb-3 text-sm font-semibold text-card-foreground">
            {chart.chart_name}
          </p>
          <Chart
            type={chart.chart_type}
            data={normalizeChartData(chart.chart_props.data)}
            series={buildChartSeries(chart.chart_props)}
            nameKey={chart.chart_props.nameKey}
            valueKey={chart.chart_props.dataKey}
            xKey={
              chart.chart_props.xAxis?.dataKey ??
              chart.chart_props.yAxis?.dataKey
            }
          />
        </div>
      ))}

      {Boolean(data.finding?.length) && <FindingList findings={data.finding!} />}

      {data.table?.map((table, index) => (
        <div
          key={`${table.table_name}-${index}`}
          className="rounded-xl border bg-transparent p-4"
        >
          <DataTable
            title={table.table_name}
            columns={buildTableColumns(table.columns, table.rows, table.table_name)}
            rows={table.rows}
            exportFileName={table.table_name}
          />
        </div>
      ))}

      {data.report?.map((report, index) => (
        <div
          key={`report-${index}`}
          className={cn("w-full min-w-0", !data.action?.length && "max-w-[75%]")}
        >
          <Report {...report} />
        </div>
      ))}

      {data.text_data?.trim() && <MarkdownText text={data.text_data} />}

      {Boolean(data.insight?.length) && <InsightList insights={data.insight!} />}

      {Boolean(data.action?.length) && (
        <div className="flex flex-wrap gap-2">
          {data.action!.map((action, index) => {
            const isNotify = action.action_label === "Notify"

            return (
              <Button
                key={`${action.action_label}-${index}`}
                type="button"
                size="sm"
                variant={isNotify ? "secondary" : "default"}
                className="cursor-pointer gap-1.5"
                // The action tracker lived in the retired Mojo service; Elze-backend has no
                // equivalent yet, so both actions are placeholders until it does.
                onClick={() => toast("Coming soon")}
              >
                {isNotify ? (
                  <Bell className="size-3.5" />
                ) : (
                  <ListChecks className="size-3.5" />
                )}
                {action.action_label}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
