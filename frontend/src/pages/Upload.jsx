import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle, Download, ChevronRight, Info, Cpu } from 'lucide-react'
import useNetworkStore from '../store/networkStore'
import { parseCSV, buildGraphFromEdgeList, buildHierarchy, generateSampleCSV } from '../utils/csvParser'
import { useNetworkData } from '../hooks/useNetworkData'
import {
  estimateFrustrationIndex, estimateOrganizationalPositivity,
  estimateInternalPositivity, estimateOrganizationalBalance,
  estimateInternalBalance
} from '../utils/metricHelpers'

const EXPECTED_COLUMNS = [
  { name: 'source', required: true, desc: 'Source node (employee name/ID)' },
  { name: 'target', required: true, desc: 'Target node (employee name/ID)' },
  { name: 'weight', required: false, desc: 'Tie strength (numeric)' },
  { name: 'department_source', required: false, desc: 'Department of source node' },
  { name: 'department_target', required: false, desc: 'Department of target node' },
  { name: 'q1', required: false, desc: 'Cross-Parker: Advice frequency (0-5)' },
  { name: 'q2', required: false, desc: 'Cross-Parker: Expertise recognition (0-5)' },
  { name: 'q3', required: false, desc: 'Cross-Parker: Information usefulness (0-6)' },
  { name: 'q4', required: false, desc: 'Cross-Parker: Knowledge awareness (0-6)' },
]

export default function UploadPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  const { setRawData, setGraphData, setHierarchyData, setMetrics, setUploadStatus, uploadStatus } = useNetworkStore()
  const { analyseWithBackend, apiStatus } = useNetworkData()

  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [savedFile, setSavedFile] = useState(null)

  const processFile = useCallback(async (file) => {
    setProcessing(true)
    setError(null)
    setSavedFile(file)
    setUploadStatus('uploading')

    try {
      const result = await parseCSV(file)
      const { data, meta } = result

      if (!data || data.length === 0) throw new Error('CSV file is empty.')
      if (!meta.fields.includes('source') && !meta.fields.includes('Source'))
        throw new Error('CSV must have a "source" column.')
      if (!meta.fields.includes('target') && !meta.fields.includes('Target'))
        throw new Error('CSV must have a "target" column.')

      const graphData = buildGraphFromEdgeList(data)
      const hierarchyData = buildHierarchy(graphData.nodes)

      const fi = estimateFrustrationIndex(graphData.nodes, graphData.links)
      const orgPos = estimateOrganizationalPositivity(graphData.links)
      const intPos = estimateInternalPositivity(graphData.nodes, graphData.links)
      const orgBal = estimateOrganizationalBalance(graphData.nodes, graphData.links)
      const intBal = estimateInternalBalance(graphData.nodes, graphData.links)

      setRawData(data, file.name)
      setGraphData(graphData)
      setHierarchyData(hierarchyData)
      setMetrics({
        frustrationIndex: fi,
        organizationalPositivity: orgPos,
        organizationalBalance: orgBal,
        internalPositivity: intPos,
        internalBalance: intBal,
        degreeCentrality: null,
      })
      setUploadStatus('success')

      setPreview({
        fileName: file.name,
        rows: data.length,
        nodes: graphData.nodes.length,
        edges: graphData.links.length,
        hasSignedData: meta.fields.some((f) => ['q1', 'q2', 'q3', 'q4'].includes(f)),
        departments: [...new Set(graphData.nodes.map((n) => n.department))],
        sampleRows: data.slice(0, 3),
        columns: meta.fields,
      })

      // Fire-and-forget backend enrichment (upgrades estimates with full NetworkX results)
      analyseWithBackend(file).catch(() => {/* backend offline — estimates remain */})

    } catch (err) {
      setError(err.message)
      setUploadStatus('error')
    } finally {
      setProcessing(false)
    }
  }, [analyseWithBackend])

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) processFile(acceptedFiles[0])
  }, [processFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  })

  const loadDemo = () => {
    const csv = generateSampleCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const file = new File([blob], 'cross_parker_sample.csv', { type: 'text/csv' })
    processFile(file)
  }

  const downloadSample = () => {
    const csv = generateSampleCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'cross_parker_sample.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen grid-bg" style={{ padding: '40px 24px' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10 animate-fade-up">
          <p className="font-code text-xs mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
            STEP 01 / IMPORT DATA
          </p>
          <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: 8 }}>
            Upload Your Dataset
          </h1>
          <p className="font-body" style={{ color: 'var(--text-secondary)' }}>
            Import a CSV edge list. Optionally include Cross-Parker survey columns (q1–q4) for signed network analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Upload zone */}
          <div className="lg:col-span-2 animate-fade-up delay-100">
            <div
              {...getRootProps()}
              className="card p-10 text-center cursor-pointer transition-all"
              style={{
                borderStyle: 'dashed',
                borderColor: isDragActive ? '#00d4a0' : uploadStatus === 'success' ? '#00d4a0' : 'rgba(79,195,247,0.25)',
                background: isDragActive ? 'rgba(0,212,160,0.04)' : 'var(--bg-card)',
                boxShadow: isDragActive ? 'var(--glow-green)' : undefined,
              }}
            >
              <input {...getInputProps()} />

              {uploadStatus === 'success' ? (
                <div>
                  <CheckCircle size={48} style={{ color: '#00d4a0', margin: '0 auto 16px' }} />
                  <p className="font-display text-sm" style={{ color: '#00d4a0', marginBottom: 4 }}>
                    Dataset Loaded
                  </p>
                  <p className="font-code text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {preview?.fileName}
                  </p>
                </div>
              ) : processing ? (
                <div>
                  <div style={{
                    width: 48, height: 48, border: '3px solid rgba(79,195,247,0.2)',
                    borderTop: '3px solid #4fc3f7', borderRadius: '50%',
                    margin: '0 auto 16px', animation: 'spin 1s linear infinite',
                  }} />
                  <p className="font-code text-xs" style={{ color: 'var(--text-secondary)' }}>Parsing dataset...</p>
                </div>
              ) : (
                <div>
                  <Upload size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
                  <p className="font-display text-sm" style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
                    {isDragActive ? 'Drop your CSV here' : 'Drag & drop your CSV file'}
                  </p>
                  <p className="font-body text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                    or click to browse
                  </p>
                  <span className="tag" style={{ background: 'rgba(79,195,247,0.1)', color: '#4fc3f7' }}>
                    .CSV files only
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-lg flex items-start gap-3" style={{
                background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.3)',
              }}>
                <AlertCircle size={16} style={{ color: '#ff4757', marginTop: 2 }} />
                <p className="font-body text-sm" style={{ color: '#ff4757' }}>{error}</p>
              </div>
            )}

            {/* Sample buttons */}
            <div className="flex gap-3 mt-4">
              <button className="btn-secondary flex items-center gap-2" style={{ padding: '8px 16px' }} onClick={loadDemo}>
                <FileText size={14} /> Load Sample Data
              </button>
              <button className="btn-secondary flex items-center gap-2" style={{ padding: '8px 16px' }} onClick={downloadSample}>
                <Download size={14} /> Download Sample CSV
              </button>
            </div>

            {/* Backend API status indicator */}
            {uploadStatus === 'success' && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-lg" style={{
                background: apiStatus === 'success'
                  ? 'rgba(0,212,160,0.06)'
                  : apiStatus === 'loading'
                  ? 'rgba(79,195,247,0.06)'
                  : apiStatus === 'error'
                  ? 'rgba(245,166,35,0.06)'
                  : 'transparent',
                border: `1px solid ${apiStatus === 'success' ? 'rgba(0,212,160,0.2)' : apiStatus === 'loading' ? 'rgba(79,195,247,0.15)' : 'rgba(245,166,35,0.2)'}`,
                display: apiStatus === 'idle' ? 'none' : 'flex',
              }}>
                <Cpu size={13} style={{ color: apiStatus === 'success' ? '#00d4a0' : apiStatus === 'loading' ? '#4fc3f7' : '#f5a623' }} />
                <span className="font-code text-xs" style={{ color: apiStatus === 'success' ? '#00d4a0' : apiStatus === 'loading' ? '#4fc3f7' : '#f5a623' }}>
                  {apiStatus === 'loading' && 'Running NetworkX analysis on backend…'}
                  {apiStatus === 'success' && 'Full NetworkX metrics loaded from backend'}
                  {apiStatus === 'error' && 'Backend offline — showing client-side estimates'}
                </span>
              </div>
            )}

            {/* Preview */}
            {preview && (
              <div className="card mt-6 p-6 animate-fade-up">
                <p className="font-code text-xs mb-4" style={{ color: '#4fc3f7', letterSpacing: '0.1em' }}>
                  DATASET PREVIEW
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Rows', value: preview.rows },
                    { label: 'Nodes', value: preview.nodes },
                    { label: 'Edges', value: preview.edges },
                    { label: 'Departments', value: preview.departments.length },
                  ].map((s) => (
                    <div key={s.label} style={{
                      background: 'rgba(13,31,51,0.8)', border: '1px solid rgba(79,195,247,0.1)',
                      borderRadius: 8, padding: '10px 14px', textAlign: 'center',
                    }}>
                      <div className="font-display text-xl" style={{ color: '#4fc3f7' }}>{s.value}</div>
                      <div className="font-code text-xs" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {preview.hasSignedData && (
                  <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{
                    background: 'rgba(0,212,160,0.06)', border: '1px solid rgba(0,212,160,0.2)',
                  }}>
                    <CheckCircle size={14} style={{ color: '#00d4a0' }} />
                    <span className="font-code text-xs" style={{ color: '#00d4a0' }}>
                      Cross-Parker columns detected — signed edge analysis enabled
                    </span>
                  </div>
                )}

                <p className="font-code text-xs mb-2" style={{ color: 'var(--text-muted)' }}>DEPARTMENTS DETECTED</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {preview.departments.map((d) => (
                    <span key={d} className="tag" style={{ background: 'rgba(79,195,247,0.08)', color: 'var(--text-secondary)' }}>
                      {d}
                    </span>
                  ))}
                </div>

                <div className="text-right">
                  <button
                    className="btn-primary flex items-center gap-2 ml-auto"
                    style={{ padding: '12px 28px', fontSize: '0.8rem' }}
                    onClick={() => navigate('/analysis')}
                  >
                    ANALYSE NETWORK
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Column reference */}
          <div className="animate-fade-up delay-200">
            <div className="card p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Info size={14} style={{ color: '#4fc3f7' }} />
                <p className="font-code text-xs" style={{ color: '#4fc3f7', letterSpacing: '0.08em' }}>
                  EXPECTED COLUMNS
                </p>
              </div>
              <div className="space-y-3">
                {EXPECTED_COLUMNS.map((col) => (
                  <div key={col.name} style={{ paddingBottom: 12, borderBottom: '1px solid rgba(79,195,247,0.06)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-code text-xs" style={{ color: '#4fc3f7' }}>{col.name}</span>
                      <span className="tag" style={{
                        background: col.required ? 'rgba(0,212,160,0.1)' : 'rgba(74,109,138,0.2)',
                        color: col.required ? '#00d4a0' : 'var(--text-muted)',
                        fontSize: '0.55rem',
                      }}>
                        {col.required ? 'REQUIRED' : 'OPTIONAL'}
                      </span>
                    </div>
                    <p className="font-body" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{col.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5" style={{ background: 'rgba(245,166,35,0.04)', borderColor: 'rgba(245,166,35,0.2)' }}>
              <p className="font-code text-xs mb-3" style={{ color: '#f5a623', letterSpacing: '0.08em' }}>
                ⚠ NOTE
              </p>
              <p className="font-body" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Client-side metrics are quick estimates. For full algorithmic accuracy, ensure the backend API is running.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
