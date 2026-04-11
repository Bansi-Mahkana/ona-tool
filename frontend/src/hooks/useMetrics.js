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
  estimateOrganizationalPositivity,
  estimateInternalPositivity,
  estimateOrganizationalBalance,
  estimateInternalBalance,
} from '../utils/metricHelpers'

const API_BASE = '/api'

export function useMetrics() {
  const { graphData, pendingChanges, setMetrics } = useNetworkStore()
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!graphData) return

    // Debounced backend re-computation (only when changes exist)
    if (pendingChanges.length === 0) return

    // Client-side instant update for pending changes
    const { nodes, links } = graphData
    const fi = estimateFrustrationIndex(nodes, links)
    const orgPos = estimateOrganizationalPositivity(links)
    const intPos = estimateInternalPositivity(nodes, links)
    const orgBal = estimateOrganizationalBalance(nodes, links)
    const intBal = estimateInternalBalance(nodes, links)

    setMetrics({
      frustrationIndex: fi,
      organizationalPositivity: orgPos,
      organizationalBalance: orgBal,
      executive: { positivity: {}, balance: {} }, // Estimates not implemented for tiers yet
      division: { positivity: {}, balance: {} },
      group: { positivity: intPos, balance: intBal },
    })

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
          organizationalPositivity: data.organizational_positivity,
          organizationalBalance: data.organizational_balance,
          executive: data.executive,
          division: data.division,
          group: data.group,
          degreeCentrality: data.degree_centrality,
        })
      } catch {
        // Backend offline — client estimates already set above
      }
    }, 800)

    return () => clearTimeout(debounceRef.current)
  }, [graphData, pendingChanges.length])
}
