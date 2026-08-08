import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}))

import imageCompression from 'browser-image-compression'
import {
  prepareForUpload,
  assertSupported,
  isHeic,
  UnsupportedImageError,
  SIZE_LIMIT,
} from './imagePipeline'

/** A File of a given size, without allocating the bytes twice over. */
function fileOfSize(bytes, name = 'shot.jpg', type = 'image/jpeg') {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: bytes })
  return file
}

/** A File whose first 12 bytes are a real ISO base-media ftyp box. */
function fileWithBrand(brand, name = 'photo.jpg') {
  const header = new Uint8Array(12)
  header.set([0, 0, 0, 12], 0)
  header.set([...'ftyp'].map((c) => c.charCodeAt(0)), 4)
  header.set([...brand].map((c) => c.charCodeAt(0)), 8)
  return new File([header], name, { type: '' })
}

beforeEach(() => {
  vi.mocked(imageCompression).mockReset()
})

describe('prepareForUpload', () => {
  it('returns a file already under the limit untouched', async () => {
    const file = fileOfSize(3 * 1024 * 1024)

    const result = await prepareForUpload(file)

    // Identity, not just an equal-sized copy: recompressing a 3 MB photo
    // only degrades it, and Cloudinary optimizes delivery anyway.
    expect(result).toBe(file)
    expect(imageCompression).not.toHaveBeenCalled()
  })

  it('leaves headroom below the limit rather than racing it exactly', async () => {
    // 9.9 MB is under 10 MB but over the 95% threshold — the multipart
    // envelope could still push it past the server guard.
    const file = fileOfSize(Math.floor(SIZE_LIMIT * 0.99))
    vi.mocked(imageCompression).mockResolvedValue(
      new File(['smaller'], 'shot.jpg', { type: 'image/jpeg' })
    )

    await prepareForUpload(file)

    expect(imageCompression).toHaveBeenCalled()
  })

  it('compresses gently — full resolution up to 5000px, quality 0.92', async () => {
    const file = fileOfSize(45 * 1024 * 1024)
    vi.mocked(imageCompression).mockResolvedValue(
      new File(['smaller'], 'shot.jpg', { type: 'image/jpeg' })
    )

    await prepareForUpload(file)

    expect(imageCompression).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        maxSizeMB: 9,
        maxWidthOrHeight: 5000,
        initialQuality: 0.92,
        preserveExif: true,
      })
    )
  })

  it('renames the compressed output to .jpg', async () => {
    // Compression emits image/jpeg. If the name still says .png the server's
    // extension check rejects bytes it would otherwise accept.
    const file = fileOfSize(20 * 1024 * 1024, 'sunset.png', 'image/png')
    vi.mocked(imageCompression).mockResolvedValue(
      new File(['smaller'], 'sunset.png', { type: 'image/jpeg' })
    )

    const result = await prepareForUpload(file)

    expect(result.name).toBe('sunset.jpg')
    expect(result.type).toBe('image/jpeg')
  })

  it('reports compression progress', async () => {
    const onProgress = vi.fn()
    const file = fileOfSize(20 * 1024 * 1024)
    vi.mocked(imageCompression).mockResolvedValue(
      new File(['smaller'], 'shot.jpg', { type: 'image/jpeg' })
    )

    await prepareForUpload(file, onProgress)

    expect(imageCompression).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ onProgress })
    )
  })

  it('reports 100% immediately for a file it does not touch', async () => {
    const onProgress = vi.fn()

    await prepareForUpload(fileOfSize(1024), onProgress)

    expect(onProgress).toHaveBeenCalledWith(100)
  })
})

describe('HEIC handling', () => {
  it('rejects by extension', async () => {
    const file = fileOfSize(4 * 1024 * 1024, 'IMG_0421.HEIC', '')

    await expect(prepareForUpload(file)).rejects.toThrow(UnsupportedImageError)
  })

  it('rejects by mime type', async () => {
    const file = fileOfSize(4 * 1024 * 1024, 'photo', 'image/heic')

    await expect(assertSupported(file)).rejects.toThrow(UnsupportedImageError)
  })

  it('catches a .heic renamed to .jpg by sniffing the ftyp box', async () => {
    // Renaming does not make Chrome or Firefox able to decode it — canvas
    // fails, so the extension check alone is not enough.
    await expect(isHeic(fileWithBrand('heic'))).resolves.toBe(true)
    await expect(isHeic(fileWithBrand('mif1'))).resolves.toBe(true)
  })

  it('does not mistake an MP4 ftyp box for HEIC', async () => {
    await expect(isHeic(fileWithBrand('isom', 'clip.mp4'))).resolves.toBe(false)
  })

  it('explains what to do instead of just failing', async () => {
    const file = fileOfSize(1024, 'IMG_0421.heic', '')

    await expect(prepareForUpload(file)).rejects.toThrow(/Most Compatible/)
  })
})

describe('extension guard', () => {
  it.each(['.jpg', '.jpeg', '.png', '.webp'])(
    'accepts %s — the four the API allows',
    async (extension) => {
      await expect(
        assertSupported(fileOfSize(1024, `shot${extension}`))
      ).resolves.toBeUndefined()
    }
  )

  it.each(['shot.gif', 'shot.tiff', 'shot.bmp', 'shot.raw', 'noextension'])(
    'rejects %s before the upload rather than as a 400',
    async (name) => {
      await expect(
        assertSupported(fileOfSize(1024, name))
      ).rejects.toThrow(UnsupportedImageError)
    }
  )
})
