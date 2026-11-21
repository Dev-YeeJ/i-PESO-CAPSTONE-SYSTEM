import { describe, expect, it } from 'vitest'
import { disabilityDetailFor, physicalDetailsPayload } from '../disabilityDetails'

describe('disabilityDetailFor', () => {
  const rows = [
    { disability_type: 'physical', disability_specification: 'Left leg amputation, uses crutches' },
    { disability_type: 'visual', disability_specification: null },
    { disability_type: 'others', disability_specification: 'Autism' },
  ]

  it('reads each description from its own row, so Physical and Others never swap', () => {
    expect(disabilityDetailFor(rows, 'others')).toBe('Autism')
    expect(disabilityDetailFor(rows, 'physical')).toBe('Left leg amputation, uses crutches')
  })

  it('returns an empty string when there is no description', () => {
    expect(disabilityDetailFor(rows, 'visual')).toBe('')
    expect(disabilityDetailFor(rows, 'hearing')).toBe('')
    expect(disabilityDetailFor(undefined, 'others')).toBe('')
  })
})

describe('physicalDetailsPayload', () => {
  it('sends the trimmed description while Physical is ticked', () => {
    expect(physicalDetailsPayload(['physical', 'visual'], '  Uses a wheelchair  ')).toBe('Uses a wheelchair')
  })

  it('sends an empty string (so the API asks for it) when Physical is ticked but blank', () => {
    expect(physicalDetailsPayload(['physical'], '   ')).toBe('')
    expect(physicalDetailsPayload(['physical'], undefined)).toBe('')
  })

  it('sends null, never leaving the key out, when Physical is not ticked', () => {
    expect(physicalDetailsPayload(['visual'], 'left over text')).toBeNull()
    expect(physicalDetailsPayload(['none'], '')).toBeNull()
  })
})
