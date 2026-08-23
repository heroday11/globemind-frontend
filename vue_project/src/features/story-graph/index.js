export {
  buildStoryGraphEvidenceParams,
  buildStoryGraphListRequest,
  buildStoryGraphWorkspaceRequest,
  createStoryGraphApi,
  hasStoryGraphEvidenceTarget,
  storyGraphApi,
} from './api.js'

export { L2_RUN_ID, L3_RUN_ID, storyGraphAdapterConfig } from './config.js'

export {
  avoidMacroCollisions,
  buildMacroDisplayEdges,
  buildMacroLaneMap,
  buildMacroLaneOffsets,
  buildMacroTimelineX,
  compareMacroNodes,
  macroLaneLabel,
  macroLaneXPull,
  macroNodeTime,
  normalizeMacroLane,
  orderStoryNodes,
} from './flow-model.js'

export {
  normalizeL2ChainSummary,
  normalizeL3MacroSummary,
  parsePairKey,
  transformL2ChainResponse,
  transformL3MacroResponse,
} from './model.js'

export {
  angleLabel,
  buildGraphMetrics,
  buildStoryStatsText,
  buildStorySummaryLine,
  cleanEntityLabel,
  cleanStoryTitle,
  edgeLabel,
  evidenceLevel,
  familyLabel,
  filterStorySummaries,
  focusKindLabel,
  formatActorPair,
  formatNewsDate,
  formatRange,
  getFallbackStoryTitle,
  getSummaryCountLabel,
  layerPriority,
  makeMainInspector,
  qualityLabel,
  relationLabel,
  relationEvidenceText,
  relationStrengthLabel,
  researchValueLabel,
  researchValueScore,
  sortStorySummariesByResearchValue,
  sortRelatedStories,
} from './presentation.js'

export async function loadStoryGraphRenderer() {
  const module = await import('./story-graph-react-flow.js')
  return module.createStoryGraphRenderer
}
