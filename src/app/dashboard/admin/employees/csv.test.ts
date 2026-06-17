import { describe, it, expect } from 'vitest'
import { parseEmployeeCsv } from './csv'

describe('parseEmployeeCsv', () => {
  it('parses rows with all fields specified', () => {
    const text = 'name,contact,can_volunteer,can_receive_volunteers,is_active\nAlice,alice@x.com,true,false,true'

    const result = parseEmployeeCsv(text)

    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      { name: 'Alice', contact: 'alice@x.com', can_volunteer: true, can_receive_volunteers: false, is_active: true },
    ])
  })

  it('defaults missing boolean columns to true', () => {
    const text = 'name,contact\nBob,bob@x.com'

    const result = parseEmployeeCsv(text)

    expect(result.rows).toEqual([
      { name: 'Bob', contact: 'bob@x.com', can_volunteer: true, can_receive_volunteers: true, is_active: true },
    ])
  })

  it('skips rows missing a name or contact and reports an error', () => {
    const text = 'name,contact\n,missing-name@x.com\nNo Contact,'

    const result = parseEmployeeCsv(text)

    expect(result.rows).toEqual([])
    expect(result.errors).toHaveLength(2)
  })

  it('requires a header row with name and contact columns', () => {
    const text = 'Alice,alice@x.com'

    const result = parseEmployeeCsv(text)

    expect(result.rows).toEqual([])
    expect(result.errors[0]).toMatch(/header/i)
  })

  it('returns an error for empty input', () => {
    const result = parseEmployeeCsv('')

    expect(result.rows).toEqual([])
    expect(result.errors).toEqual(['No data found.'])
  })

  it('handles columns in any order', () => {
    const text = 'contact,name\nalice@x.com,Alice'

    const result = parseEmployeeCsv(text)

    expect(result.rows).toEqual([
      { name: 'Alice', contact: 'alice@x.com', can_volunteer: true, can_receive_volunteers: true, is_active: true },
    ])
  })
})
