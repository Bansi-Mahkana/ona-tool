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
  estimateOrganizationalNegativity,
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
    const orgNeg = estimateOrganizationalNegativity(links)

    setMetrics({
      frustration_index: fi,
      organizational_positivity: orgPos,
      organizational_balance: orgBal,
      organizational_negativity: orgNeg,
      executive: { positivity: {}, balance: {} },
      division: { positivity: {}, balance: {} },
      group: { positivity: intPos, balance: intBal },
    })

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        // CLEAN THE PAYLOAD: D3 objects -> String IDs
        const cleanNodes = graphData.nodes.map(n => ({
          id: String(n.id),
          department: n.department ? String(n.department) : "Unknown",
          label: n.label ? String(n.label) : String(n.id)
        }))
        const cleanLinks = graphData.links.map(l => ({
          source: typeof l.source === 'object' ? String(l.source.id) : String(l.source),
          target: typeof l.target === 'object' ? String(l.target.id) : String(l.target),
          weight: l.weight || 1.0,
          sign: l.sign || 0,
          q1: l.q1, q2: l.q2, q3: l.q3, q4: l.q4
        }))

        const payload = { nodes: cleanNodes, links: cleanLinks }
        const res = await fetch(`${API_BASE}/network/metrics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) return
        const data = await res.json()
        console.log("BACKEND METRICS RESPONSE:", data)
        setMetrics({
          frustration_index: data.frustration_index,
          organizational_positivity: data.organizational_positivity,
          organizational_balance: data.organizational_balance,
          executive: data.executive,
          division: data.division,
          group: data.group,
          degree_centrality: data.degree_centrality,
          organizational_negativity: data.organizational_negativity,
          negativity_ranking: data.negativity_ranking,
        })
      } catch {
        // Backend offline — client estimates already set above
      }
    }, 800)

    return () => clearTimeout(debounceRef.current)
  }, [graphData, pendingChanges.length])
}
