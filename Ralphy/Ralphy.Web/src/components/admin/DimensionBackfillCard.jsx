import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const BATCH_SIZE = 25

/**
 * One-time maintenance: photos uploaded before v2.0 have no width or height,
 * so the justified feed falls back to 3:2 for them and every row comes out the
 * same shape. Cloudinary still knows the real dimensions — this reads them back.
 *
 * Hidden entirely once nothing is missing, so it doesn't become permanent
 * furniture on the dashboard.
 */
export default function DimensionBackfillCard() {
  const [status, setStatus] = useState(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/photos/dimensions/status')
      setStatus(res.data.data)
    } catch {
      setStatus(null)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const run = async () => {
    setRunning(true)
    setProgress(null)

    let filled = 0
    let stuck = 0

    try {
      // Loop the batches rather than making the operator click until it's
      // done. Each batch is one Cloudinary Admin API call per photo, and that
      // API is rate-limited well below delivery.
      for (;;) {
        const res = await api.post('/photos/dimensions/backfill', null, {
          params: { batchSize: BATCH_SIZE },
        })
        const batch = res.data.data

        filled += batch.updated
        stuck = batch.failed
        setProgress({ filled, remaining: batch.remaining })

        if (batch.remaining === 0) break

        // Nothing moved and nothing left to try — the rest point at assets
        // that are gone from Cloudinary. Stop rather than spin.
        if (batch.updated === 0) break
      }

      if (filled > 0) {
        toast.success(`${filled} photo${filled === 1 ? '' : 's'} measured`)
      }
      if (stuck > 0) {
        toast.error(
          `${stuck} photo${stuck === 1 ? '' : 's'} missing from Cloudinary — `
          + 'those rows need deleting by hand.'
        )
      }
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Backfill failed')
    } finally {
      setRunning(false)
      load()
    }
  }

  if (!status || status.missing === 0) return null

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border
                    border-teal-500/30 bg-teal-500/5 px-5 py-4">
      <span className="text-xl" aria-hidden="true">📐</span>

      <div className="min-w-[14rem] flex-1">
        <p className="text-sm font-medium text-teal-200">
          {status.missing} of {status.total} photos have no stored size
        </p>
        <p className="text-xs text-teal-400/70">
          {running && progress
            ? `Measuring… ${progress.filled} done, ${progress.remaining} to go`
            : 'The photo grid uses real proportions when it has them, and '
              + 'falls back to 3:2 when it doesn’t. Cloudinary still knows '
              + 'the originals.'}
        </p>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2
                   text-xs font-semibold text-white transition-colors
                   hover:bg-teal-500 disabled:opacity-50"
      >
        {running && (
          <span className="h-3 w-3 animate-spin rounded-full border-2
                           border-white border-t-transparent" />
        )}
        {running ? 'Measuring…' : 'Measure them'}
      </button>
    </div>
  )
}
