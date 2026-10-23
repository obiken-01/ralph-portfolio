import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('exifr', () => ({
  default: { parse: vi.fn() },
}))

import exifr from 'exifr'
import { readPhotoMeta, dmsToDecimal } from './exif'

const EMPTY = {
  takenAt: null,
  latitude: null,
  longitude: null,
  camera: {
    camera: null,
    lens: null,
    fNumber: null,
    exposureTime: null,
    iso: null,
    focalLength: null,
    editedWith: null,
  },
}

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

    await expect(readPhotoMeta(anyFile())).resolves.toEqual(EMPTY)
  })

  it('survives a malformed EXIF block', async () => {
    vi.mocked(exifr.parse).mockRejectedValue(new Error('bad marker'))

    // Losing the metadata is acceptable; losing the upload is not.
    await expect(readPhotoMeta(anyFile())).resolves.toEqual(EMPTY)
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

describe('readPhotoMeta — camera and exposure', () => {
  it('reads a Lightroom export of a Sony frame', async () => {
    // Lightroom keeps the camera's own tags on export and adds Software.
    vi.mocked(exifr.parse).mockResolvedValue({
      Make: 'SONY',
      Model: 'ILCE-7M4',
      LensModel: 'FE 35mm F1.8',
      FNumber: 1.8,
      ExposureTime: 0.004,
      ISO: 200,
      FocalLength: 35,
      FocalLengthIn35mmFormat: 35,
      Software: 'Adobe Photoshop Lightroom Classic 13.2 (Windows)',
    })

    const { camera } = await readPhotoMeta(anyFile())

    expect(camera).toEqual({
      camera: 'Sony ILCE-7M4',
      lens: 'FE 35mm F1.8',
      fNumber: 1.8,
      exposureTime: 0.004,
      iso: 200,
      focalLength: 35,
      editedWith: 'Lightroom',
    })
  })

  it('does not repeat a brand the model already names', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({
      Make: 'NIKON CORPORATION',
      Model: 'NIKON Z 6',
    })

    expect((await readPhotoMeta(anyFile())).camera.camera).toBe('NIKON Z 6')
  })

  it('keeps a short all-caps brand as written', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ Make: 'DJI', Model: 'FC3582' })

    expect((await readPhotoMeta(anyFile())).camera.camera).toBe('DJI FC3582')
  })

  it('uses the 35mm equivalent for a phone-sized sensor', async () => {
    // 6.9mm is what the lens really is; 24mm is what anyone means by it.
    vi.mocked(exifr.parse).mockResolvedValue({
      Make: 'Apple',
      Model: 'iPhone 15 Pro',
      FocalLength: 6.86,
      FocalLengthIn35mmFormat: 24,
      Software: '17.4.1',
    })

    const { camera } = await readPhotoMeta(anyFile())

    expect(camera.camera).toBe('Apple iPhone 15 Pro')
    expect(camera.focalLength).toBe(24)
    // A firmware version is not an editor.
    expect(camera.editedWith).toBeNull()
  })

  it('keeps the real focal length on a larger sensor', async () => {
    // A 23mm lens on APS-C is marked 23mm, not 35mm.
    vi.mocked(exifr.parse).mockResolvedValue({
      FocalLength: 23,
      FocalLengthIn35mmFormat: 35,
    })

    expect((await readPhotoMeta(anyFile())).camera.focalLength).toBe(23)
  })

  it('recognises Photoshop and Snapseed too', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ Software: 'Adobe Photoshop 25.0' })
    expect((await readPhotoMeta(anyFile())).camera.editedWith).toBe('Photoshop')

    vi.mocked(exifr.parse).mockResolvedValue({ Software: 'Snapseed 2.0' })
    expect((await readPhotoMeta(anyFile())).camera.editedWith).toBe('Snapseed')
  })

  it('drops zero and junk exposure values', async () => {
    // Some cameras write 0 for "not recorded".
    vi.mocked(exifr.parse).mockResolvedValue({
      FNumber: 0,
      ExposureTime: NaN,
      ISO: 0,
      FocalLength: -5,
      Make: '  ',
      Model: 'X100V\u0000\u0000',
    })

    const { camera } = await readPhotoMeta(anyFile())

    expect(camera.fNumber).toBeNull()
    expect(camera.exposureTime).toBeNull()
    expect(camera.iso).toBeNull()
    expect(camera.focalLength).toBeNull()
    expect(camera.camera).toBe('X100V')
  })

  it('drops an ISO too large for the API to accept', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({ ISO: 4294967295 })

    expect((await readPhotoMeta(anyFile())).camera.iso).toBeNull()
  })

  it('asks exifr for the camera tags', async () => {
    vi.mocked(exifr.parse).mockResolvedValue({})

    await readPhotoMeta(anyFile())

    expect(exifr.parse).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({
        pick: expect.arrayContaining(['Model', 'LensModel', 'ISO', 'Software']),
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
