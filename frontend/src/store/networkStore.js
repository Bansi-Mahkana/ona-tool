import { create } from 'zustand'

const useNetworkStore = create((set, get) => ({
  // ── Raw dataset ──────────────────────────────────────────────────
  rawData: null,
  fileName: null,
  uploadStatus: 'idle', // idle | uploading | success | error

  // ── Graph data ───────────────────────────────────────────────────
  graphData: null,        // { nodes: [], links: [] }
  hierarchyData: null,    // hierarchical org tree

  // ── Signed edges (Cross-Parker integration) ──────────────────────
  // Each edge can have a sign: +1 (positive), -1 (negative), 0 (neutral)
  edgeSigns: {},          // { "nodeA-nodeB": { sign, q1, q2, q3, q4 } }

  // ── Metrics ──────────────────────────────────────────────────────
  metrics: {
    frustrationIndex: null,       // 0-1
    organizationalPositivity: null,
    organizationalBalance: null,
    internalPositivity: null,     // { deptA: 0.5, deptB: ... }
    internalBalance: null,        // { deptA: 0.2, deptB: ... }
    degreeCentrality: null,       // { nodeA: 0.1, nodeB: ... }
  },

  // ── Snapshot for before/after comparison ─────────────────────────
  snapshotMetrics: null,    // saved copy of metrics before user changes
  pendingChanges: [],       // list of { type, from, to, description }

  // ── UI state ─────────────────────────────────────────────────────
  selectedNode: null,
  selectedEdge: null,
  activeTab: 'network',     // 'network' | 'hierarchy' | 'signed'
  sidebarOpen: true,
  interpretationMode: 'current', // 'current' | 'after'
  theme: 'dark',

  // ── Actions ──────────────────────────────────────────────────────
  setRawData: (data, fileName) => set({ rawData: data, fileName }),
  setUploadStatus: (status) => set({ uploadStatus: status }),
  setGraphData: (graphData) => set({ graphData }),
  setHierarchyData: (hierarchyData) => set({ hierarchyData }),
  setEdgeSigns: (edgeSigns) => set({ edgeSigns }),

  setMetrics: (metrics) => set({ metrics: { ...get().metrics, ...metrics } }),

  snapshotCurrentMetrics: () =>
    set({ snapshotMetrics: { ...get().metrics } }),

  addPendingChange: (change) =>
    set({ pendingChanges: [...get().pendingChanges, change] }),

  clearPendingChanges: () =>
    set({ pendingChanges: [], snapshotMetrics: null }),

  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setInterpretationMode: (mode) => set({ interpretationMode: mode }),

  // Move employee from one department to another (experiment)
  moveEmployee: (nodeId, newDepartment) => {
    const { graphData, pendingChanges } = get()
    if (!graphData) return
    const updated = {
      ...graphData,
      nodes: graphData.nodes.map((n) =>
        n.id === nodeId ? { ...n, department: newDepartment } : n
      ),
    }
    set({
      graphData: updated,
      pendingChanges: [
        ...pendingChanges,
        { type: 'move', nodeId, newDepartment, description: `Moved ${nodeId} → ${newDepartment}` },
      ],
    })
  },

  // Toggle edge between two nodes (add/remove connection)
  toggleEdge: (sourceId, targetId) => {
    const { graphData, pendingChanges } = get()
    if (!graphData) return
    const key = `${sourceId}-${targetId}`
    const exists = graphData.links.find(
      (l) => l.source === sourceId && l.target === targetId
    )
    const updated = {
      ...graphData,
      links: exists
        ? graphData.links.filter((l) => !(l.source === sourceId && l.target === targetId))
        : [...graphData.links, { source: sourceId, target: targetId, weight: 3, sign: 0 }],
    }
    set({
      graphData: updated,
      pendingChanges: [
        ...pendingChanges,
        { type: exists ? 'remove_edge' : 'add_edge', sourceId, targetId, description: exists ? `Removed edge ${sourceId}↔${targetId}` : `Added edge ${sourceId}↔${targetId}` },
      ],
    })
  },

  reset: () =>
    set({
      rawData: null,
      fileName: null,
      uploadStatus: 'idle',
      graphData: null,
      hierarchyData: null,
      edgeSigns: {},
      metrics: {
        frustrationIndex: null,
        organizationalPositivity: null,
        organizationalBalance: null,
        internalPositivity: null,
        internalBalance: null,
        degreeCentrality: null,
      },
      snapshotMetrics: null,
      pendingChanges: [],
      selectedNode: null,
      selectedEdge: null,
    }),
}))

export default useNetworkStore
