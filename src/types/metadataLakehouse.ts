export interface Connector {
  id: string
  name: string
  status: 'available' | 'planned'
  description: string
  docsUrl?: string
  credentials: CredentialField[]
}

export interface CredentialField {
  id: string
  label: string
  type: 'text' | 'secret'
  placeholder?: string
  help?: string
}

export interface Connection {
  id: string
  companyId: number
  provider: string
  name: string
  host: string
  secretHint: string
  status: 'connected' | 'invalid'
  lastError: string | null
  lastVerifiedAt: string | null
  createdAt: string | null
  selectedDatasetCount?: number
  selectedDatasets?: SelectedDataset[]
  context?: ContextVersionHeadline | null
  published?: ContextVersionHeadline | null
}

export interface PublishedConnection {
  id: string
  name: string
}

export interface PublishedContextOption {
  id: string
  connectionId: string
  connectionName: string
  name: string
  version: number
  label: string
  live: boolean
  publishedAt: string
}

export interface PublishedVersionEntry {
  id: string
  version: number
  label: string
  live: boolean
  publishedAt: string
  publishedBy: string | null
  objectCount: number
}

export interface PublishedContextGroup {
  connectionId: string
  connectionName: string
  provider: string
  host: string
  companyId: number | null
  companyName: string | null
  name: string
  versions: PublishedVersionEntry[]
}

export interface CompanyPublished {
  items: PublishedContextGroup[]
  total: number
  versionCount: number
}

export interface CompanyPublishedQuery {
  search?: string
  page: number
  pageSize: number
}

export interface ConnectedAccount {
  accountId: string | number | null
  accountName: string | null
  accountEmail: string | null
}

export interface CreatedConnection {
  connection: Connection
  account: ConnectedAccount
  datasets: WarehouseDataset[]
  limit: number
  truncated: boolean
}

export interface DatasetListing {
  datasets: WarehouseDataset[]
  fetchedAt: string
  limit: number
  truncated: boolean
}

export interface WarehouseDataset {
  id: string
  name: string
  description: string | null
  rowCount: number | null
  columnCount: number | null
  owner: string | null
  lastUpdated: string | number | null

  schema?: string | null
  type?: string | null
  tableCount?: number | null
  sizeBytes?: number | null
  qualityScore?: number | null
  metadataStatus?: 'none' | 'partial' | 'complete' | string | null
}

export interface SelectedDataset {
  id: string
  name: string | null
  rowCount: number | null
  columnCount: number | null
  selectedAt: string
}

export interface ProfileDataset {
  datasetId: string
  name: string
  tableCount: number | null
  tables: ProfileTableRef[]
}

export interface ProfileTableRef {
  id: string
  datasetId: string
  name: string
  rowCount: number | null
  columnCount: number | null
}

export interface ProfileOverview {
  datasets: ProfileDataset[]
  profiledAt: string | null
}

export interface TableProfile {
  id: string
  datasetId: string
  name: string
  description: string | null
  rowCount: number | null
  columnCount: number | null
  sizeBytes: number | null
  qualityScore: number | null
  lastRefreshedAt: string | null
  owner: string | null
  columns: ColumnProfile[]
  sample: SampleRecords | null
  statsSampleSize: number | null
  qualityIssues: QualityIssue[]
}

export interface ColumnProfile {
  name: string
  dataType: string
  nullable: boolean | null
  nullPercent: number | null
  uniqueCount: number | null
  semanticType: string | null
  isPrimaryKey: boolean
  isForeignKey: boolean
  min: string | number | null
  max: string | number | null
  distribution: DistributionBucket[] | null
}

export interface DistributionBucket {
  label: string
  count: number
}

export interface SampleRecords {
  columns: string[]
  rows: Array<Array<string | number | boolean | null>>
  sampledFrom: number | null
}

export interface QualityIssue {
  id: string
  severity: 'info' | 'warning' | 'error' | string
  column: string | null
  title: string
  detail: string | null
  affectedRows: number | null
}

export interface ModelNodeColumn {
  name: string
  dataType: string | null
  isPrimaryKey: boolean
  isForeignKey: boolean
}

export interface ModelNode {
  id: string
  label: string
  datasetId: string | null
  kind: 'fact' | 'dimension' | 'table' | string
  columns: ModelNodeColumn[]
  position: { x: number; y: number } | null
}

export type RelationshipType =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'many-to-many'
  | string

export interface ModelEdge {
  id: string
  source: string
  target: string
  sourceColumn: string
  targetColumn: string
  relationshipType: RelationshipType
  confidence: number | null
  status: 'suggested' | 'accepted' | 'rejected' | 'inferred' | string
  rule?: 'declared' | 'primary_key' | 'same_name' | string
  joinCondition: string | null
  suggestion: string | null
}

export interface ModelGraph {
  connectionId: string
  status: 'pending' | 'generating' | 'ready' | 'failed'
  generatedAt: string | null
  error: string | null
  nodes: ModelNode[]
  edges: ModelEdge[]
}

export interface RelationshipInput {
  source: string
  target: string
  sourceColumn: string
  targetColumn: string
  relationshipType: RelationshipType
  status?: ModelEdge['status']
}

export type ReviewItemType =
  | 'metric'
  | 'definition'
  | 'relationship'
  | 'entity'
  | 'dimension'
  | 'table'
  | 'column'
  | string

export type ReviewItemStatus = 'pending' | 'approved' | 'rejected' | 'skipped' | string

export interface ReviewItem {
  id: string
  type: ReviewItemType
  name: string
  status: ReviewItemStatus
  confidence: number | null
  description: string | null
  formula: string | null
  source: string | null
  downstreamImpact: string | null
  fields: Record<string, unknown> | null
}

export interface ReviewQueue {
  items: ReviewItem[]
  counts: Record<string, number>
  total: number
  matched: number
}

export interface ReviewQuery {
  type?: string
  status?: string
  search?: string
  page: number
  pageSize: number
}

export interface ReviewItemUpdate {
  name?: string
  description?: string | null
  formula?: string | null
  source?: string | null
  fields?: Record<string, unknown>
}

export interface PublishStat {
  id: string
  label: string
  value: number | string
}

export interface PublishDataset {
  id: string
  name: string
  tableCount: number | null
}

export interface PublishContentItem {
  id: string
  label: string
  included: boolean
}

export interface PublishBlocker {
  id: string
  severity: 'blocker' | 'warning' | string
  message: string
  step: WorkflowStepId | null
}

export interface PublishSummary {
  connectionId: string
  publishedVersion: {
    id: string
    name: string
    label: string
    publishedAt: string
    publishedBy: number | null
    objectCount: number
  } | null
  suggestedName: string
  previousVersion: number | null
  draft: ContextVersion | null
  stats: PublishStat[]
  datasets: PublishDataset[]
  content: PublishContentItem[]
  ready: boolean
  blockers: PublishBlocker[]
}

export interface PublishValidation {
  valid: boolean
  blockers: PublishBlocker[]
  warnings: PublishBlocker[]
}

export interface PublishedVersion {
  id: string
  name: string
  version: number
  sessionId: string | null
  objectCount: number
  stats: Record<string, unknown>
  publishedBy: number | null
  publishedAt: string
}

export interface PublishResult {
  id: string
  name: string
  version: string
  publishedAt: string
  objectCount: number
  status: 'published' | 'failed' | string
}

export type ContextVersionStatus = 'draft' | 'published'

export interface ContextVersion {
  id: string
  connectionId: string
  name: string
  version: number
  label: string
  status: ContextVersionStatus
  currentStep: WorkflowStepId | null
  datasetIds: string[]
  basedOnId: string | null
  sessionId: string | null
  extractionMode: 'agent' | 'demo' | null
  extractedAt: string | null
  objectCount: number
  stats: Record<string, unknown>
  createdBy: number | null
  createdAt: string
  updatedAt: string
  publishedBy: number | null
  publishedAt: string | null
}

export interface ContextVersionState {
  connectionId: string
  status: ContextVersionStatus | 'none'
  draft: ContextVersion | null
  latestPublished: ContextVersion | null
  versions: ContextVersion[]
}

export interface ContextVersionHeadline {
  name: string
  version: number
  label: string
  status: ContextVersionStatus
  publishedAt: string | null
  updatedAt: string
}

export type GlossaryTermType = 'entity' | 'metric' | 'dimension' | 'term'

export type GlossaryTermState =
  | 'ai_generated'
  | 'ai_suggested'
  | 'human_approved'
  | 'human_override'
  | 'source_verified'
  | 'rejected'

export interface GlossaryTerm {
  id: string
  term: string
  typeLabel: string
  definition: string | null
  appliesTo: string | null
  confidence: number | null
  state: GlossaryTermState
}

export interface Understanding {
  matched: number
  stats: {
    termsGenerated: number
    entityCount: number
    metricCount: number
    dimensionCount: number
    averageConfidence: number | null
    humanApproved: number
    approvedThisWeek: number
  }
  terms: GlossaryTerm[]
}

export type GlossaryFilter = 'all' | 'ai' | 'review' | 'approved' | 'override'

export interface GlossaryQuery {
  filter: GlossaryFilter
  search?: string
  page: number
  pageSize: number
}

export type WorkflowStepId =
  | 'connect'
  | 'context'
  | 'discover'
  | 'profile'
  | 'understand'
  | 'model'
  | 'review'
  | 'publish'

export interface ContextProfile {
  id: string
  connectionId: string
  name: string
  description: string | null
  createdBy: number | null
  createdAt: string
  updatedAt: string
}
