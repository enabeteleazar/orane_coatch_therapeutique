import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('concatène des classes simples', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('ignore les valeurs falsy', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b')
  })

  it('résout les conflits Tailwind en gardant la dernière valeur', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('applique les classes conditionnelles', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active')
  })
})
