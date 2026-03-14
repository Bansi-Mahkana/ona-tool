/**
 * useMetrics.js
 *
 * Watches graphData in the store and re-runs client-side metric
 * estimates whenever the graph changes (node move, edge add/remove).
 *
 * If the backend is available, it also fires a /api/network/simulate
 * call to get accurate NetworkX metrics for the changed graph.
 */
import { useEffect, useRef } from 'react'
import useNetworkStore from '../store/networkStore'
import {
  estimateFrustrationIndex,
  estimateOrganizationalCost,
  computeDensity,
  countIsolated,
  computeSignedBalance,
} from '../utils/metricHelpers'

const API_BASE = '/api'

export function useMetrics() {
  const { graphData, pendingChanges, setMetrics } = useNetworkStore()
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!graphData) return

    // Client-side instant update
    const { nodes, links } = graphData
    const fi = estimateFrustrationIndex(nodes, links)
    const oc = estimateOrganizationalCost(nodes, links)
    const density = computeDensity(nodes, links)
    const isolated = countIsolated(nodes, links)
    const signedBalance = computeSignedBalance(links)

    setMetrics({ frustrationIndex: fi, organizationalCost: oc, networkDensity: density, isolatedNodes: isolated, signedBalance })

    // Debounced backend re-computation (only when changes exist)
    if (pendingChanges.length === 0) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const payload = { nodes: graphData.nodes, links: graphData.links }
        const res = await fetch(`${API_BASE}/network/metrics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) return
        const data = await res.json()
        setMetrics({
          frustrationIndex: data.frustration_index,
          organizationalCost: data.organizational_cost,
          networkDensity: data.network_density,
          avgPathLength: data.avg_path_length,
          clusteringCoefficient: data.clustering_coefficient,
          bridgeCount: data.bridge_count,
          isolatedNodes: data.isolated_nodes,
          signedBalance: data.signed_balance,
        })
      } catch {
        // Backend offline — client estimates already set above
      }
    }, 800)

    return () => clearTimeout(debounceRef.current)
  }, [graphData, pendingChanges.length])
}
