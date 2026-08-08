import { describe, it, expect } from 'vitest'
import { distanceMeters, NEARBY_THRESHOLD_M } from './geo'

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    const point = { latitude: 13.35, longitude: 120.63 }
    expect(distanceMeters(point, point)).toBe(0)
  })

  it('reads a few hundred metres as a few hundred metres', () => {
    // ~0.001° of latitude is ~111 m.
    const a = { latitude: 13.35, longitude: 120.63 }
    const b = { latitude: 13.351, longitude: 120.63 }

    expect(distanceMeters(a, b)).toBeGreaterThan(100)
    expect(distanceMeters(a, b)).toBeLessThan(120)
  })

  it('treats GPS drift as the same place', () => {
    // 20 m apart — the same waterfall pinned on two different days.
    const a = { latitude: 11.16, longitude: 122.06 }
    const b = { latitude: 11.16018, longitude: 122.06 }

    expect(distanceMeters(a, b)).toBeLessThan(NEARBY_THRESHOLD_M)
  })

  it('keeps two genuinely different places well apart', () => {
    const apoReef = { latitude: 12.67, longitude: 120.45 }
    const placeholder = { latitude: 13.2, longitude: 120.3 }

    // The placeholder was chosen clear of Apo Reef on purpose.
    expect(distanceMeters(apoReef, placeholder)).toBeGreaterThan(50000)
  })

  it('is symmetric', () => {
    const a = { latitude: 11.16, longitude: 122.06 }
    const b = { latitude: 13.42, longitude: 120.46 }

    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 3)
  })
})
