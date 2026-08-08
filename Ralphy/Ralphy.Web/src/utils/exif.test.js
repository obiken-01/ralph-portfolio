import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('exifr', () => ({
  default: { parse: vi.fn() },
}))

import exifr from 'exifr'
import { readPhotoMeta, dmsToDecimal } from './exif'

const anyFile = () => new File(['x'], 'shot.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  vi.mocked(exifr.parse).mockReset()
})

describe('readPhotoMeta', () => {
  it('reads capture date and GPS', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      DateTimeOriginal: new Date('2025-03-14T06:30:00Z'),
      latitude: 13.3542,
      longitude: 120.6321,
    })

    const meta = await readPhotoMeta(anyFile())

    expect(meta.takenAt).toBe('2025-03-14T06:30:00.000Z')
    expect(meta.latitude).toBeCloseTo(13.3542)
    expect(meta.longitude).toBeCloseTo(120.6321)
  })

  it('falls back to CreateDate when DateTimeOriginal is absent', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      CreateDate: new Date('2024-11-02T01:15:00Z'),
    })

    const meta = await readPhotoMeta(anyFile())

    expect(meta.takenAt).toBe('2024-11-02T01:15:00.000Z')
  })

  it('returns nulls for a photo with no EXIF, without throwing', async () => {
    // The ordinary case: screenshots, exports, anything through an editor.
    vi.mocked(exifr.parse).mockResolvedValue(null)

    await expect(readPhotoMeta(anyFile())).resolves.toEqual({
      takenAt: null,
      latitude: null,
      longitude: null,
    })
  })

  it('survives a malformed EXIF block', async () => {
    vi.mocked(exifr.parse).mockRejectedValue(new Error('bad marker'))

    // Losing the metadata is acceptable; losing the upload is not.
    await expect(readPhotoMeta(anyFile())).resolves.toEqual({
      takenAt: null,
      latitude: null,
      longitude: null,
    })
  })

  it('drops 0,0 — the signature of a GPS chip that never got a fix', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ latitude: 0, longitude: 0 })

    const meta = await readPhotoMeta(anyFile())

    expect(meta.latitude).toBeNull()
    expect(meta.longitude).toBeNull()
  })

  it('drops out-of-range coordinates instead of passing them to the API', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      latitude: 200,
      longitude: 400,
    })

    const meta = await readPhotoMeta(anyFile())

    expect(meta.latitude).toBeNull()
    expect(meta.longitude).toBeNull()
  })

  it('drops a dead-clock date', async () => {
    // Cameras with a flat backup battery report 1970 or 1980.
    vi.mocked(exifr.parse).mockResolvedValue({
      DateTimeOriginal: new Date('1980-01-01T00:00:00Z'),
    })

    expect((await readPhotoMeta(anyFile())).takenAt).toBeNull()
  })

  it('drops an unparseable date', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      DateTimeOriginal: 'not a date',
    })

    expect((await readPhotoMeta(anyFile())).takenAt).toBeNull()
  })

  it('only asks exifr for the tags it uses', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({})

    await readPhotoMeta(anyFile())

    expect(exifr.parse).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({
        pick: expect.arrayContaining(['DateTimeOriginal', 'GPSLatitude']),
        gps: true,
      })
    )
  })
})

describe('dmsToDecimal', () => {
  it('converts degrees, minutes and seconds', () => {
    // 13° 21' 15" N
    expect(dmsToDecimal([13, 21, 15], 'N')).toBeCloseTo(13.354166, 5)
  })

  it('negates for southern and western hemispheres', () => {
    expect(dmsToDecimal([13, 21, 15], 'S')).toBeCloseTo(-13.354166, 5)
    expect(dmsToDecimal([120, 37, 55], 'W')).toBeCloseTo(-120.631944, 5)
  })
})
