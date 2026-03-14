/**
 * useNetworkData.js
 * 
 * Custom hook that handles the full integration between:
 *  - Frontend CSV parsing (client-side preview)
 *  - Backend API (full NetworkX analysis)
 * 
 * Flow:
 *  1. User uploads CSV
 *  2. Client-side: quick preview metrics are computed immediately
 *  3. Background: CSV is sent to /api/metrics/upload-csv
 *  4. API returns full NetworkX metrics, replaces estimates
 * 
 * Also exposes:
 *  - fetchRecommendations(): POST to /api/recommendations/
 *  - simulateChange(): POST to /api/network/simulate
 */
import { useCallback, useState } from 'react'
import useNetworkStore from '../store/networkStore'

const API_BASE = '/api'

export function useNetworkData() {
  const [apiStatus, setApiStatus] = useState('idle') // idle | loading | success | error
  const [apiError, setApiError] = useState(null)

  const { setMetrics, graphData, setGraphData } = useNetworkStore()

  /**
   * Send CSV file to backend for full analysis.
   * Updates metrics in global store when complete.
   */
  const analyseWithBackend = useCallback(async (file) => {
    setApiStatus('loading')
    setApiError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE}/metrics/upload-csv`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Backend analysis failed')
      }

      const data = await response.json()

      // Update graph data with backend's edge signs (more accurate)
      if (data.graph) {
        setGraphData(data.graph)
      }

      // Update metrics with full NetworkX results
      if (data.metrics) {
        setMetrics({
          frustrationIndex: data.metrics.frustration_index,
          organizationalCost: data.metrics.organizational_cost,
          networkDensity: data.metrics.network_density,
          avgPathLength: data.metrics.avg_path_length,
          clusteringCoefficient: data.metrics.clustering_coefficient,
          bridgeCount: data.metrics.bridge_count,
          isolatedNodes: data.metrics.isolated_nodes,
          signedBalance: data.metrics.signed_balance,
          // Also store centrality data
          degreeCentrality: data.metrics.degree_centrality,
          betweennessCentrality: data.metrics.betweenness_centrality,
        })
      }

      setApiStatus('success')
      return data

    } catch (err) {
      console.warn('Backend unavailable, using client-side estimates:', err.message)
      setApiError(err.message)
      setApiStatus('error')
      return null
    }
  }, [setMetrics, setGraphData])

  /**
   * Fetch recommendations from backend for the current graph.
   */
  const fetchRecommendations = useCallback(async () => {
    if (!graphData) return null
    setApiStatus('loading')

    try {
      const payload = {
        nodes: graphData.nodes,
        links: graphData.links,
      }

      const response = await fetch(`${API_BASE}/recommendations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to fetch recommendations')
      const data = await response.json()
      setApiStatus('success')
      return data

    } catch (err) {
      setApiError(err.message)
      setApiStatus('error')
      return null
    }
  }, [graphData])

  /**
   * Simulate a structural change and get metric deltas from backend.
   * change = { moves, add_edges, remove_edges }
   */
  const simulateChange = useCallback(async (change) => {
    if (!graphData) return null

    try {
      const payload = {
        graph: { nodes: graphData.nodes, links: graphData.links },
        change,
      }

      const response = await fetch(`${API_BASE}/network/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Simulation failed')
      return await response.json()

    } catch (err) {
      console.warn('Simulation failed:', err.message)
      return null
    }
  }, [graphData])

  return {
    apiStatus,
    apiError,
    analyseWithBackend,
    fetchRecommendations,
    simulateChange,
  }
}
