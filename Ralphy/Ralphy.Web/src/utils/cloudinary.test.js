import { describe, it, expect } from 'vitest'
import { cldImage, cldVideoPoster, cldVideo } from './cloudinary'

const UPLOADED = 'https://res.cloudinary.com/demo/image/upload/v1/ralphy/photos/falls.jpg'

describe('cldImage', () => {
  it('inserts auto format, auto quality and a width cap', () => {
    expect(cldImage(UPLOADED, 700)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_700,c_limit/v1/ralphy/photos/falls.jpg'
    )
  })

  it('defaults to 800px when no width is given', () => {
    expect(cldImage(UPLOADED)).toContain('w_800')
  })

  // The gallery renders whatever url the API hands back, and not every one is
  // a Cloudinary url — an old post, a hand-entered link, a seeded fixture.
  it('passes a non-Cloudinary url through untouched', () => {
    const external = 'https://example.com/photo.jpg'
    expect(cldImage(external)).toBe(external)
  })

  it.each([null, undefined, 42])('returns %s unchanged', (value) => {
    expect(cldImage(value)).toBe(value)
  })
})

describe('cldVideoPoster', () => {
  it('grabs the first frame as a jpeg', () => {
    const video = 'https://res.cloudinary.com/demo/video/upload/v1/clip.mp4'
    const poster = cldVideoPoster(video, 400)

    expect(poster).toContain('so_0')
    expect(poster).toContain('w_400')
    expect(poster.endsWith('.jpg')).toBe(true)
  })

  it('returns null rather than a broken url for a non-Cloudinary video', () => {
    expect(cldVideoPoster('https://youtube.com/watch?v=abc')).toBeNull()
  })
})

describe('cldVideo', () => {
  it('adds auto quality', () => {
    const video = 'https://res.cloudinary.com/demo/video/upload/v1/clip.mp4'
    expect(cldVideo(video)).toContain('/upload/q_auto/')
  })
})
