import { describe, it, expect } from 'vitest'
import { dedupeMembers } from './useWorkspaceMembers'
import type { User } from '@/types'

function makeUser(id: string): User {
  return {
    _id: id,
    name: `User ${id}`,
    email: `${id}@test.com`,
    avatar: null,
    role: 'dev',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
}

describe('dedupeMembers', () => {
  it('returns empty array when owner is undefined and members is empty', () => {
    expect(dedupeMembers(undefined, [])).toEqual([])
  })

  it('returns only owner when members is empty', () => {
    const owner = makeUser('owner1')
    const result = dedupeMembers(owner, [])
    expect(result).toEqual([owner])
  })

  it('returns owner + members as flat list', () => {
    const owner = makeUser('owner1')
    const member1 = makeUser('member1')
    const member2 = makeUser('member2')
    const result = dedupeMembers(owner, [{ user: member1 }, { user: member2 }])
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual(owner)
    expect(result[1]).toEqual(member1)
    expect(result[2]).toEqual(member2)
  })

  it('deduplicates when owner is also in members list', () => {
    const owner = makeUser('owner1')
    const member1 = makeUser('member1')
    const result = dedupeMembers(owner, [{ user: owner }, { user: member1 }])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(owner)
    expect(result[1]).toEqual(member1)
  })

  it('preserves order: owner first', () => {
    const owner = makeUser('owner1')
    const member1 = makeUser('member1')
    const result = dedupeMembers(owner, [{ user: member1 }])
    expect(result[0]._id).toBe('owner1')
  })

  it('returns only members when owner is undefined', () => {
    const member1 = makeUser('member1')
    const result = dedupeMembers(undefined, [{ user: member1 }])
    expect(result).toEqual([member1])
  })
})
