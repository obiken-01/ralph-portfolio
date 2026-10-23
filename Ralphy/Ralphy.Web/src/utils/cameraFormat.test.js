import { describe, it, expect } from 'vitest'
import {
  exposureLine,
  formatAperture,
  formatShutter,
  gearLine,
  parseShutter,
} from './cameraFormat'

describe('formatShutter', () => {
  it('shows fast speeds as a fraction', () => {
    expect(formatShutter(0.004)).toBe('1/250s')
    expect(formatShutter(1 / 8000)).toBe('1/8000s')
  })

  it('shows slow speeds in seconds', () => {
    expect(formatShutter(2)).toBe('2s')
    expect(formatShutter(0.5)).toBe('0.5s')
    expect(formatShutter(30)).toBe('30s')
  })

  it('returns null for nothing', () => {
    expect(formatShutter(null)).toBeNull()
    expect(formatShutter(0)).toBeNull()
  })
})

describe('formatAperture', () => {
  it('drops a needless decimal', () => {
    expect(formatAperture(1.8)).toBe('f/1.8')
    expect(formatAperture(8)).toBe('f/8')
  })
})

describe('exposureLine', () => {
  it('joins what is known, in the order photographers read it', () => {
    expect(exposureLine({
      focalLength: 35, fNumber: 1.8, exposureTime: 0.004, iso: 200,
    })).toBe('35mm · f/1.8 · 1/250s · ISO 200')
  })

  it('skips gaps', () => {
    expect(exposureLine({ fNumber: 2.8, iso: 400 })).toBe('f/2.8 · ISO 400')
  })

  it('is null for a photo with no EXIF', () => {
    expect(exposureLine({})).toBeNull()
    expect(exposureLine(undefined)).toBeNull()
  })
})

describe('gearLine', () => {
  it('joins camera and lens', () => {
    expect(gearLine({ camera: 'Sony ILCE-7M4', lens: 'FE 35mm F1.8' }))
      .toBe('Sony ILCE-7M4 · FE 35mm F1.8')
  })

  it('is null with neither', () => {
    expect(gearLine({})).toBeNull()
  })
})

describe('parseShutter', () => {
  it('reads fractions and seconds, with or without the unit', () => {
    expect(parseShutter('1/250')).toBeCloseTo(0.004)
    expect(parseShutter('1/250s')).toBeCloseTo(0.004)
    expect(parseShutter('0.5')).toBe(0.5)
    expect(parseShutter('2s')).toBe(2)
  })

  it('round-trips what formatShutter shows', () => {
    expect(formatShutter(parseShutter(formatShutter(0.004)))).toBe('1/250s')
  })

  it('is null for an empty field and NaN for junk', () => {
    expect(parseShutter('  ')).toBeNull()
    expect(parseShutter(undefined)).toBeNull()
    expect(parseShutter('fast')).toBeNaN()
    expect(parseShutter('1/0')).toBeNaN()
  })
})
