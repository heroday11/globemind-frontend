import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BaseEdge,
  EdgeText,
  getNodesBounds,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  getBezierPath,
  useStore,
} from 'reactflow'

import 'reactflow/dist/style.css'
import './story-graph-react-flow.css'
import {
  EDGE_COLORS,
  EVENT_PALETTES,
  EVENT_TYPE_LABELS,
  FIT_VIEW_OPTIONS,
  HIDDEN_HANDLE_STYLE,
  INITIAL_FIT_VIEW_OPTIONS,
  STORAGE_KEY_PREFIX,
  VISIBLE_HANDLE_STYLE,
} from './config.js'
import {
  avoidMacroCollisions,
  buildMacroDisplayEdges,
  buildMacroLaneMap,
  buildMacroLaneOffsets,
  buildMacroTimelineX,
  compareMacroNodes,
  macroLaneXPull,
  normalizeMacroLane,
  orderStoryNodes,
} from './flow-model.js'
import {
  buildStoryGraphEdgeInspector,
  buildStoryGraphNodeInspector,
  formatCountLabel,
} from './presentation.js'
import {
  normalizeStoryRelation,
  storyRelationLabel,
} from '../../governance/storyRelations.js'

const h = React.createElement

const nodeTypes = {
  eventNode: StoryEventNode,
  groupNode: StoryGroupNode,
}

const edgeTypes = {
  intelEdge: IntelEdge,
}

const LABELED_TEMPORAL_TYPES = new Set([
  'continuation',
  'continued',
  'progression',
  'transition',
  'response',
  'same_thread',
  'event_to_outcome',
])

const LAYOUT_EDGE_LABELS = {
  macro_sequence: '主线排序',
  branch_sequence: '支线排序',
  branch: '布局分支',
}

export function createStoryGraphRenderer(container) {
  const root = createRoot(container)
  const api = {
    fitView: null,
    focusInteraction: null,
    zoomIn: null,
    zoomOut: null,
    autoLayout: null,
    saveLayout: null,
  }

  return {
    render(props) {
      root.render(
        h(StoryGraphCanvas, {
          ...props,
          onReady(nextApi) {
            api.fitView = nextApi.fitView
            api.focusInteraction = nextApi.focusInteraction
            api.zoomIn = nextApi.zoomIn
            api.zoomOut = nextApi.zoomOut
            api.autoLayout = nextApi.autoLayout
            api.saveLayout = nextApi.saveLayout
          },
        }),
      )
    },
    fitView(options) {
      api.fitView?.(options || FIT_VIEW_OPTIONS)
    },
    focusInteraction(interaction) {
      api.focusInteraction?.(interaction)
    },
    zoomIn() {
      api.zoomIn?.()
    },
    zoomOut() {
      api.zoomOut?.()
    },
    autoLayout() {
      api.autoLayout?.()
    },
    saveLayout() {
      return api.saveLayout?.()
    },
    destroy() {
      api.fitView = null
      api.focusInteraction = null
      api.zoomIn = null
      api.zoomOut = null
      api.autoLayout = null
      api.saveLayout = null
      root.unmount()
    },
  }
}

function StoryGraphCanvas({
  storyGraph,
  showTimelineLinks,
  onSelectInspector,
  onCanvasClick,
  onReady,
}) {
  const canvasRef = useRef(null)
  const [instance, setInstance] = useState(null)
  const [manualPositions, setManualPositions] = useState({})
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const didAutoFitRef = useRef(false)
  const storageKey = `${STORAGE_KEY_PREFIX}${storyGraph?.story_id || 'unknown'}`

  useEffect(() => {
    setManualPositions(readSavedLayout(storageKey))
    didAutoFitRef.current = false
  }, [storageKey])

  const model = useMemo(
    () => buildFlowModel(storyGraph, showTimelineLinks, manualPositions),
    [storyGraph, showTimelineLinks, manualPositions],
  )
  const eventNodes = useMemo(() => nodes.filter((node) => node.type === 'eventNode'), [nodes])

  useEffect(() => {
    setNodes(model.nodes)
    setEdges(model.edges)
  }, [model])

  useEffect(() => {
    if (!instance || !eventNodes.length || didAutoFitRef.current) return
    let cancelled = false
    let attempt = 0
    let timer = 0
    let frame = 0

    const scheduleFit = (delay) => {
      timer = window.setTimeout(() => {
        frame = window.requestAnimationFrame(() => {
          if (cancelled || didAutoFitRef.current) return
          const applied = applyViewportToEventNodes(
            instance,
            eventNodes,
            canvasRef.current,
            { ...INITIAL_FIT_VIEW_OPTIONS, interaction: storyGraph?.interactions?.[0] },
          )
          if (applied) {
            didAutoFitRef.current = true
            return
          }
          attempt += 1
          if (attempt < 8) {
            scheduleFit(80)
          }
        })
      }, delay)
    }

    scheduleFit(90)

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [eventNodes, instance, model.fitSignature, storyGraph])

  useEffect(() => {
    if (!instance) return
    onReady?.({
      fitView(options) {
        applyViewportToEventNodes(
          instance,
          eventNodes,
          canvasRef.current,
          options || FIT_VIEW_OPTIONS,
        )
      },
      focusInteraction(interaction) {
        applyViewportToEventNodes(instance, eventNodes, canvasRef.current, { interaction })
      },
      zoomIn() {
        instance.zoomIn({ duration: 160 })
      },
      zoomOut() {
        instance.zoomOut({ duration: 160 })
      },
      autoLayout() {
        didAutoFitRef.current = false
        setManualPositions({})
        clearSavedLayout(storageKey)
      },
      saveLayout() {
        const nextLayout = collectEventNodePositions(nodes)
        if (!writeSavedLayout(storageKey, nextLayout)) return false
        setManualPositions(nextLayout)
        return true
      },
    })
  }, [eventNodes, instance, nodes, onReady, storageKey])

  function handleNodeDrag(_event, draggedNode) {
    if (draggedNode.type !== 'eventNode') return
    setNodes((currentNodes) => {
      const movedNodes = currentNodes.map((node) => {
        if (node.id !== draggedNode.id) return node
        return {
          ...node,
          position: {
            x: draggedNode.position.x,
            y: draggedNode.position.y,
          },
        }
      })
      return refreshGroupNodeBounds(movedNodes)
    })
  }

  function handleNodeDragStop(_event, draggedNode) {
    if (draggedNode.type !== 'eventNode') return
    setManualPositions((current) => ({
      ...current,
      [draggedNode.id]: {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
      },
    }))
  }

  return h(
    'div',
    { className: 'story-rf-root', ref: canvasRef },
    h(
      ReactFlow,
      {
        nodes,
        edges,
        onNodesChange(changes) {
          const selection = changes.filter((change) => change.type === 'select')
          if (selection.length) setNodes((current) => applyNodeChanges(selection, current))
        },
        onEdgesChange(changes) {
          const selection = changes.filter((change) => change.type === 'select')
          if (selection.length) setEdges((current) => applyEdgeChanges(selection, current))
        },
        nodeTypes,
        edgeTypes,
        minZoom: 0.08,
        maxZoom: 1.7,
        nodesDraggable: true,
        nodesConnectable: false,
        elementsSelectable: true,
        nodesFocusable: true,
        edgesFocusable: true,
        panOnDrag: [0, 2],
        zoomOnScroll: true,
        selectionOnDrag: false,
        zoomOnDoubleClick: false,
        deleteKeyCode: null,
        defaultEdgeOptions: {
          type: 'intelEdge',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 8,
            height: 8,
            color: '#89a9d5',
          },
        },
        proOptions: { hideAttribution: true },
        onInit: setInstance,
        onPaneContextMenu(event) {
          event.preventDefault()
        },
        onNodeDrag: handleNodeDrag,
        onNodeDragStop: handleNodeDragStop,
        onNodeClick(_event, node) {
          if (node.data?.payload) {
            onSelectInspector?.(node.data.payload)
          }
        },
        onEdgeClick(_event, edge) {
          if (edge.data?.payload) onSelectInspector?.(edge.data.payload)
        },
        onSelectionChange({ nodes: selectedNodes = [], edges: selectedEdges = [] }) {
          const nodePayload = selectedNodes.find((node) => node.data?.payload)?.data?.payload
          if (nodePayload) {
            onSelectInspector?.(nodePayload)
            return
          }
          const edgePayload = selectedEdges.find((edge) => edge.data?.payload)?.data?.payload
          if (edgePayload) onSelectInspector?.(edgePayload)
        },
        onPaneClick() {
          onCanvasClick?.()
        },
      },
      [
        h(Background, {
          key: 'background',
          gap: 24,
          size: 1,
          color: '#c6d2dd',
          variant: 'dots',
        }),
        h(MiniMap, {
          key: 'minimap',
          position: 'bottom-left',
          pannable: true,
          zoomable: true,
          className: 'story-rf-minimap',
          nodeStrokeWidth: 0,
          nodeColor(node) {
            return node.data?.miniColor || 'transparent'
          },
        }),
      ],
    ),
  )
}

function StoryEventNode({ data, selected }) {
  return h(
    'div',
    {
      className: ['story-rf-event', `is-${data.storyRole}`, selected ? 'is-selected' : '']
        .join(' ')
        .trim(),
      style: {
        '--event-stroke': data.stroke,
        width: `${data.width}px`,
        minHeight: `${data.height}px`,
      },
    },
    [
      renderHandle('target', 'left', Position.Left, false),
      renderHandle('target', 'right', Position.Right, false),
      renderHandle('target', 'top', Position.Top, false),
      renderHandle('target', 'bottom', Position.Bottom, false),
      renderHandle('source', 'left', Position.Left, false),
      renderHandle('source', 'right', Position.Right, false),
      renderHandle('source', 'top', Position.Top, false),
      renderHandle('source', 'bottom', Position.Bottom, false),
      h('div', { className: 'story-rf-event__shell' }, [
        h('div', { className: 'story-rf-event__type' }, data.eventTypeLabel),
        h('div', { className: 'story-rf-event__title', title: data.title }, data.title),
        h('div', { className: 'story-rf-event__meta' },
          [data.timeLabel, data.articleLabel].filter(Boolean).join(' · '),
        ),
      ]),
    ],
  )
}

function StoryGroupNode({ data }) {
  return h(
    'div',
    {
      className: ['story-rf-group', `is-${data.storyRole}`].join(' '),
      style: {
        width: `${data.width}px`,
        height: `${data.height}px`,
      },
    },
    [
      h('div', { className: 'story-rf-group__header' }, [
        h(
          'span',
          { className: 'story-rf-group__kicker' },
          data.isMacro
            ? 'L3 大事件'
            : data.storyRole === 'primary'
              ? 'L2 主链'
              : data.relationLayerLabel,
        ),
        h('strong', null, data.title),
        data.subtitle ? h('small', null, data.subtitle) : null,
      ]),
    ],
  )
}

function renderHandle(type, side, position, visible) {
  return h(Handle, {
    id: `${type}-${side}`,
    type,
    position,
    isConnectable: true,
    style: visible ? VISIBLE_HANDLE_STYLE : HIDDEN_HANDLE_STYLE,
  })
}

function IntelEdge(props) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    className,
  } = props
  const zoom = useStore((state) => (data.label ? state.transform[2] : 1))

  const pathArgs = {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  }
  const [directPath, directLabelX, directLabelY] = getBezierPath({
    ...pathArgs,
    curvature: data.curvature ?? (data.layer === 'context' ? 0.36 : 0.24),
  })
  const railY = data.arc < 0
    ? Math.min(sourceY, targetY) + data.arc
    : Math.max(sourceY, targetY) + data.arc
  const path = data.arc
    ? `M ${sourceX} ${sourceY} C ${sourceX} ${railY}, ${targetX} ${railY}, ${targetX} ${targetY}`
    : directPath
  const labelX = data.arc ? (sourceX + targetX) / 2 : directLabelX
  const labelY = data.arc ? (sourceY + 6 * railY + targetY) / 8 : directLabelY

  return h(
    React.Fragment,
    null,
    h(BaseEdge, {
      id,
      path,
      markerEnd,
      className,
      interactionWidth: 44,
      style: {
        stroke: data.stroke,
        strokeWidth: data.strokeWidth,
        strokeDasharray: data.dashArray,
        opacity: data.opacity,
      },
    }),
    data.label &&
      h(
        'g',
        {
          'aria-hidden': true,
          className: data.payload.kind === 'interaction'
            ? 'story-rf-edge-label story-rf-edge-label--interaction'
            : 'story-rf-edge-label',
          transform: `translate(${labelX} ${labelY}) scale(${1 / zoom})`,
        },
        h(EdgeText, {
          x: 0,
          y: 0,
          label: data.label,
          labelBgPadding: [5, 2],
          labelBgBorderRadius: 4,
        }),
      ),
  )
}

function buildFlowModel(storyGraph, showTimelineLinks, positionOverrides = {}) {
  const storyMap = new Map()
  const positions = new Map()
  const eventNodes = []
  const groupNodes = []
  const edges = []
  const visibleEdges = (storyGraph?.edges || [])
    .map((edge) => normalizeStoryRelation(edge))


  for (const node of storyGraph?.nodes || []) {
    const storyId = String(node.story_id || storyGraph.story_id)
    if (!storyMap.has(storyId)) {
      storyMap.set(storyId, {
        storyId,
        storyRole: storyId === String(storyGraph.story_id) ? 'primary' : 'branch',
        storyTitle:
          node.story_title ||
          (storyId === String(storyGraph.story_id) ? storyGraph.story_title : `走势链 ${storyId}`),
        relation:
          (storyGraph.related_stories || []).find((item) => String(item.story_id) === storyId) ||
          null,
        nodes: [],
        edges: [],
      })
    }
    storyMap.get(storyId).nodes.push(node)
  }

  for (const edge of visibleEdges) {
    const storyId = String(edge.source_story_id || edge.target_story_id || storyGraph.story_id)
    if (edge.layer === 'story' || String(edge.source_story_id) === String(edge.target_story_id)) {
      storyMap.get(storyId)?.edges.push(edge)
    }
  }

  for (const story of storyMap.values()) {
    story.orderedNodes = orderStoryNodes(story.nodes, story.edges)
  }

  const primaryStoryId = String(storyGraph?.story_id)
  const primaryStory = storyMap.get(primaryStoryId)
  if (!primaryStory) {
    return { nodes: [], edges: [], fitSignature: 0 }
  }

  layoutPrimaryStory(primaryStory, positions)

  const bridgeEdges = visibleEdges.filter(
    (edge) =>
      edge.layer &&
      edge.layer !== 'story' &&
      String(edge.source_story_id) !== String(edge.target_story_id),
  )

  const branches = Array.from(storyMap.values())
    .filter((story) => story.storyId !== primaryStoryId)
    .sort((left, right) => {
      const leftPriority = left.relation?.layer === 'backbone' ? 0 : 1
      const rightPriority = right.relation?.layer === 'backbone' ? 0 : 1
      if (leftPriority !== rightPriority) return leftPriority - rightPriority
      return String(left.storyId).localeCompare(String(right.storyId))
    })

  const occupiedBySide = new Map()
  branches.forEach((story, index) => {
    const anchorX = resolveAnchorX(
      story.storyId,
      bridgeEdges,
      positions,
      primaryStoryId,
      index,
      branches.length,
    )
    const side = index % 2 === 0 ? -1 : 1
    const lane = occupiedBySide.get(side) || 0
    occupiedBySide.set(side, lane + 1)
    layoutBranchStory(story, positions, anchorX, side, lane)
  })

  for (const story of [primaryStory, ...branches]) {
    const { width: nodeWidth, height: nodeHeight } = getNodeSize()
    story.orderedNodes.forEach((node) => {
      const override = positionOverrides[node.id]
      if (!override) return
      const existing = positions.get(node.id) || {}
      positions.set(node.id, {
        ...existing,
        x: override.x + nodeWidth / 2,
        y: override.y + nodeHeight / 2,
      })
    })
  }

  const groupedStories = [primaryStory, ...branches]
  groupedStories.forEach((story) => {
    if (story.storyRole === 'branch') {
      const bounds = computeStoryBounds(story, positions)
      groupNodes.push({
        id: `group-${story.storyId}`,
        type: 'groupNode',
        position: { x: bounds.x, y: bounds.y },
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        data: {
          storyId: story.storyId,
          storyRole: story.storyRole,
          title: story.storyTitle,
          subtitle: buildStorySubtitle(story),
          relationLayerLabel: story.relation?.layer === 'backbone' ? '主干分支' : '上下文分支',
          width: bounds.width,
          height: bounds.height,
        },
        style: { width: bounds.width, height: bounds.height, zIndex: 0 },
      })
    }

    story.orderedNodes.forEach((node) => {
      const point = positions.get(node.id)
      const stroke = EVENT_PALETTES[eventPaletteKey(node.event_type)].stroke
      const { width: nodeWidth, height: nodeHeight } = getNodeSize()
      const inspectorPayload = buildStoryGraphNodeInspector(node, { storyId: story.storyId })
      const timeLabel = formatNodeTimeRange(node.start_date, node.end_date)
      const articleLabel = formatCountLabel(node.article_count, { unit: '条报道', unknown: '' })

      eventNodes.push({
        id: node.id,
        type: 'eventNode',
        position: {
          x: point.x - nodeWidth / 2,
          y: point.y - nodeHeight / 2,
        },
        sourcePosition: point.defaultSourcePosition,
        targetPosition: point.defaultTargetPosition,
        focusable: true,
        ariaLabel: [inspectorPayload.title, timeLabel, articleLabel].filter(Boolean).join('，'),
        data: {
          payload: inspectorPayload,
          storyId: story.storyId,
          storyRole: story.storyRole,
          stroke,
          width: nodeWidth,
          height: nodeHeight,
          eventTypeLabel:
            EVENT_TYPE_LABELS[node.event_type] ||
            String(node.event_type || '事件').replaceAll('_', ' '),
          title: inspectorPayload.title,
          articleLabel,
          timeLabel,
          miniColor: stroke,
        },
        style: {
          zIndex: 6,
        },
      })
    })
  })

  const timelineEdges = isMacroStory(primaryStory)
    ? buildMacroDisplayEdges(primaryStory, visibleEdges)
    : visibleEdges
  const flowEdges = [...(storyGraph.interactions || []), ...(showTimelineLinks ? timelineEdges : [])]
  const eventTitles = new Map(eventNodes.map((node) => [node.id, node.data.title]))
  const pairEdges = new Map()

  flowEdges.forEach((edge) => {
    const isInteraction = edge.kind === 'interaction'
    const sourceId = isInteraction ? edge.sourceId : edge.from_id
    const targetId = isInteraction ? edge.targetId : edge.to_id
    const sourcePoint = positions.get(sourceId)
    const targetPoint = positions.get(targetId)
    if (!sourcePoint || !targetPoint) return

    const pair = [sourceId, targetId].sort().join(':')
    const parallelIndex = pairEdges.get(pair) ?? 0
    pairEdges.set(pair, parallelIndex + 1)
    const span = Math.abs(targetPoint.x - sourcePoint.x)
    const arcDirection = ((sourcePoint.timelineIndex ?? 0) + parallelIndex) % 2 ? 1 : -1
    const arc = !isInteraction && (span > 470 || parallelIndex)
      ? arcDirection * (128 + Math.min(span * 0.13, 290) + 65 * parallelIndex)
      : 0
    const verticalHandle = arc > 0 ? 'bottom' : 'top'
    const handles = arc
      ? { source: verticalHandle, target: verticalHandle }
      : chooseHandles(sourcePoint, targetPoint)
    const isContext = edge.layer === 'context'
    const isMacroSequence =
      (sourcePoint.isMacro || targetPoint.isMacro) &&
      (edge.edge_type === 'macro_sequence' || edge.edge_type === 'branch_sequence')
    const isMacroStoryEdge = sourcePoint.isMacro || targetPoint.isMacro
    const stroke = isInteraction ? '#146c64' : edgeStroke(edge)
    const inspectorPayload = isInteraction ? edge : buildStoryGraphEdgeInspector(edge)
    const relationKind = edge.relation_semantics?.relation_kind
    const showLabel =
      relationKind === 'temporal_overlap' ||
      (relationKind === 'event_progression_signal' && edge.edge_type !== 'analysis_context') ||
      (relationKind === 'temporal_sequence' && LABELED_TEMPORAL_TYPES.has(edge.edge_type))

    edges.push({
      id: isInteraction ? edge.id : `edge-${sourceId}-${targetId}-${edge.edge_type}-${edge.layer || 'story'}`,
      source: sourceId,
      target: targetId,
      ariaLabel: [inspectorPayload.title, eventTitles.get(sourceId), eventTitles.get(targetId)]
        .filter(Boolean).join('，'),
      sourceHandle: `source-${handles.source}`,
      targetHandle: `target-${handles.target}`,
      type: 'intelEdge',
      className: [
        'story-rf-edge',
        isInteraction ? 'story-rf-edge--interaction' : '',
        isContext ? 'story-rf-edge--context' : 'story-rf-edge--story',
        isMacroStoryEdge ? 'story-rf-edge--macro' : '',
        isMacroSequence ? 'story-rf-edge--macro-sequence' : '',
      ]
        .filter(Boolean)
        .join(' '),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 11,
        height: 11,
        color: stroke,
      },
      zIndex: isInteraction ? 3 : 1,
      data: {
        payload: inspectorPayload,
        label: isInteraction || showLabel
          ? inspectorPayload.title
          : relationKind === 'layout_only' ? LAYOUT_EDGE_LABELS[edge.edge_type] : undefined,
        layer: edge.layer || 'story',
        route: 'bezier',
        edgeType: edge.edge_type,
        relationReason: edge.relation_reason,
        weight: null,
        stroke,
        strokeWidth: isInteraction ? 3 : isContext ? 1.8 : 2.1,
        dashArray: isInteraction || isMacroSequence
          ? undefined
          : isContext ? '7 10' : edge.layer === 'story' ? '11 8' : '9 8',
        opacity: isInteraction ? 1 : isContext ? 0.54 : 0.62,
        arc,
        curvature: isContext ? 0.34 : isMacroStoryEdge ? (isMacroSequence ? 0.22 : 0.3) : 0.22,
      },
    })
  })

  return {
    nodes: [...groupNodes, ...eventNodes],
    edges,
    fitSignature: eventNodes.length * 1000 + edges.length + Object.keys(positionOverrides).length,
  }
}

function getNodeSize() {
  return { width: 274, height: 114 }
}

function staggerOffset(index, amplitude) {
  return [0, -amplitude, amplitude, -amplitude / 2, amplitude / 2][index % 5]
}

function layoutPrimaryStory(story, positions) {
  if (isMacroStory(story)) {
    layoutMacroStory(story, positions)
    return
  }
  const count = story.orderedNodes.length
  if (!count) return

  const gap = 330
  const startX = -((count - 1) * gap) / 2

  story.orderedNodes.forEach((node, index) => {
    positions.set(node.id, {
      x: startX + index * gap,
      y: count > 1 ? staggerOffset(index, 124) : 0,
      timelineIndex: index,
      defaultSourcePosition: Position.Right,
      defaultTargetPosition: Position.Left,
    })
  })
}

function isMacroStory(story) {
  return story.nodes?.some((node) => node.source_kind === 'l3-chain' || node.l2_chain_id)
}

function layoutMacroStory(story, positions) {
  const ordered = story.orderedNodes.slice().sort(compareMacroNodes)
  const count = ordered.length
  if (!count) return

  const laneMap = buildMacroLaneMap(ordered)
  const laneOffsets = buildMacroLaneOffsets(laneMap)
  const xById = buildMacroTimelineX(ordered)
  const placed = []

  ordered.forEach((node, index) => {
    const lane = normalizeMacroLane(node)
    const laneNodes = laneMap.get(lane) || []
    const laneIndex = Math.max(
      0,
      laneNodes.findIndex((item) => item.id === node.id),
    )
    const laneWave = staggerOffset(laneIndex, laneMap.size === 1 ? 154 : 94)
    let x = (xById.get(node.id) || 0) + macroLaneXPull(lane)
    let y = (laneOffsets.get(lane) || 0) + laneWave

    const collision = avoidMacroCollisions(x, y, placed)
    x = collision.x
    y = collision.y
    placed.push({ x, y })

    positions.set(node.id, {
      x,
      y,
      isMacro: true,
      timelineIndex: index,
      lane,
      defaultSourcePosition: Position.Right,
      defaultTargetPosition: Position.Left,
    })
  })
}

function layoutBranchStory(story, positions, anchorX, side, lane) {
  const count = story.orderedNodes.length
  if (!count) return

  const gap = 330
  const centerY = side < 0 ? -(260 + lane * 230) : 260 + lane * 230
  const startX = anchorX - ((count - 1) * gap) / 2

  story.orderedNodes.forEach((node, index) => {
    positions.set(node.id, {
      x: startX + index * gap,
      y: centerY,
      defaultSourcePosition: Position.Right,
      defaultTargetPosition: Position.Left,
    })
  })
}

function resolveAnchorX(storyId, bridgeEdges, positions, primaryStoryId, index, total) {
  const connected = bridgeEdges
    .map((edge) => {
      const primaryNodeId =
        String(edge.source_story_id) === primaryStoryId && String(edge.target_story_id) === storyId
          ? edge.from_id
          : String(edge.target_story_id) === primaryStoryId &&
              String(edge.source_story_id) === storyId
            ? edge.to_id
            : null
      return primaryNodeId ? positions.get(primaryNodeId)?.x : null
    })
    .filter((value) => Number.isFinite(value))

  if (!connected.length) {
    return (index - (total - 1) / 2) * 280
  }
  return connected.reduce((sum, value) => sum + value, 0) / connected.length
}

function computeStoryBounds(story, positions) {
  const { width: nodeWidth, height: nodeHeight } = getNodeSize()
  const points = story.orderedNodes.map((node) => positions.get(node.id)).filter(Boolean)
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs) - nodeWidth / 2 - 38
  const maxX = Math.max(...xs) + nodeWidth / 2 + 38
  const minY = Math.min(...ys) - nodeHeight / 2 - 76
  const maxY = Math.max(...ys) + nodeHeight / 2 + 48
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function chooseHandles(sourcePoint, targetPoint) {
  const dx = targetPoint.x - sourcePoint.x
  const dy = targetPoint.y - sourcePoint.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { source: 'right', target: 'left' } : { source: 'left', target: 'right' }
  }
  return dy >= 0 ? { source: 'bottom', target: 'top' } : { source: 'top', target: 'bottom' }
}

function buildStorySubtitle(story) {
  const relationLabel = story.relation
    ? storyRelationLabel(story.relation.relation_type)
    : ''
  const range = formatRange(
    story.orderedNodes[0]?.start_date,
    story.orderedNodes[story.orderedNodes.length - 1]?.end_date,
  )
  return [relationLabel, range].filter(Boolean).join(' · ')
}

function formatNodeTimeRange(start, end) {
  if (!start && !end) return ''
  const startText = start ? String(start).slice(0, 10) : ''
  const endText = end ? String(end).slice(0, 10) : ''
  if (!startText) return endText
  if (!endText || startText === endText) return startText
  if (startText.slice(0, 4) === endText.slice(0, 4)) {
    return `${startText} 至 ${endText.slice(5)}`
  }
  return `${startText} 至 ${endText}`
}

function formatRange(start, end) {
  if (!start && !end) return '无日期'
  if (start && end && start !== end)
    return `${String(start).slice(0, 10)} → ${String(end).slice(0, 10)}`
  return start || end
}

function edgeStroke(edge) {
  if (edge.layer === 'context') return EDGE_COLORS.context
  return EDGE_COLORS[edge.edge_type] || EDGE_COLORS.continuation
}

function eventPaletteKey(eventType) {
  const type = String(eventType || '').toLowerCase()
  if (
    [
      'military',
      'terrorism_espionage',
      'protest_repression',
      'conflict',
      'video_clip',
      'main_event',
    ].includes(type)
  ) {
    return 'orange'
  }
  if (['trade_conflict', 'economic', 'market_reaction', 'outcome_reaction'].includes(type)) {
    return 'yellow'
  }
  if (
    [
      'diplomacy',
      'official_update',
      'aid_disaster',
      'human_rights_migration',
      'resolution',
      'de-escalation',
    ].includes(type)
  ) {
    return 'green'
  }
  return 'purple'
}

function readSavedLayout(storageKey) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(([, point]) => {
        return Number.isFinite(point?.x) && Number.isFinite(point?.y)
      }),
    )
  } catch {
    return {}
  }
}

function writeSavedLayout(storageKey, layout) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(layout))
    return true
  } catch {
    return false
  }
}

function clearSavedLayout(storageKey) {
  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    return
  }
}

function collectEventNodePositions(nodes) {
  return nodes.reduce((acc, node) => {
    if (node.type !== 'eventNode') return acc
    acc[node.id] = {
      x: node.position.x,
      y: node.position.y,
    }
    return acc
  }, {})
}

function refreshGroupNodeBounds(nodes) {
  const groupedBounds = new Map()

  nodes.forEach((node) => {
    if (node.type !== 'eventNode') return
    const storyId = node.data?.storyId
    if (!storyId) return
    const left = node.position.x
    const top = node.position.y
    const right = left + (node.data?.width || 0)
    const bottom = top + (node.data?.height || 0)
    const current = groupedBounds.get(storyId) || {
      minX: left,
      maxX: right,
      minY: top,
      maxY: bottom,
    }
    current.minX = Math.min(current.minX, left)
    current.maxX = Math.max(current.maxX, right)
    current.minY = Math.min(current.minY, top)
    current.maxY = Math.max(current.maxY, bottom)
    groupedBounds.set(storyId, current)
  })

  return nodes.map((node) => {
    if (node.type !== 'groupNode') return node
    const bounds = groupedBounds.get(node.data?.storyId)
    if (!bounds) return node
    const position = {
      x: bounds.minX - 52,
      y: bounds.minY - 92,
    }
    const width = bounds.maxX - bounds.minX + 104
    const height = bounds.maxY - bounds.minY + 144
    return {
      ...node,
      position,
      data: {
        ...node.data,
        width,
        height,
      },
      style: {
        ...node.style,
        width,
        height,
        zIndex: 0,
      },
    }
  })
}

function applyViewportToEventNodes(instance, nodes, container, options = FIT_VIEW_OPTIONS) {
  if (!instance || !nodes?.length || !container || !instance.viewportInitialized) return false

  const targetIds = new Set(nodes.map((node) => node.id))
  const measuredNodes = (instance.getNodes?.() || []).filter(
    (node) =>
      node.type === 'eventNode' &&
      targetIds.has(node.id) &&
      Number.isFinite(node.width) &&
      Number.isFinite(node.height) &&
      node.width > 0 &&
      node.height > 0,
  )
  if (!measuredNodes.length) return false

  const { clientWidth: width, clientHeight: height } = container
  if (!width || !height || measuredNodes.length !== nodes.length) return false
  const interaction = options.interaction
  const interactionNodes = interaction
    ? measuredNodes.filter((node) => node.id === interaction.sourceId || node.id === interaction.targetId)
    : []
  const focusInteraction = interactionNodes.length === 2
  const fitNodes = focusInteraction
    ? interactionNodes
    : options.initial ? measuredNodes.slice(0, Math.max(2, Math.floor(width / 320))) : measuredNodes
  const bounds = getNodesBounds(fitNodes)
  if (
    !Number.isFinite(bounds.x) ||
    !Number.isFinite(bounds.y) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return false
  }

  if (focusInteraction) {
    const zoom = Math.min(0.9, (width - 32) / bounds.width, (height - 140) / bounds.height)
    if (zoom <= 0) return false
    instance.setCenter(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, {
      zoom,
      duration: options.initial ? 0 : 160,
    })
    return true
  }
  if (options.initial) {
    const fitWidth = width < 520 ? bounds.width : measuredNodes[0].width
    const zoom = Math.min(0.96, (width - 32) / fitWidth, (height - 72) / bounds.height)
    if (zoom <= 0) return false
    instance.setViewport({
      x: Math.min(28, width * 0.05) - bounds.x * zoom,
      y: height / 2 - (bounds.y + bounds.height / 2) * zoom,
      zoom,
    })
    return true
  }

  instance.fitView?.({
    nodes: fitNodes,
    padding: typeof options.padding === 'number' ? options.padding : FIT_VIEW_OPTIONS.padding,
    duration: options.duration ?? FIT_VIEW_OPTIONS.duration,
    includeHiddenNodes: false,
  })
  return true
}
