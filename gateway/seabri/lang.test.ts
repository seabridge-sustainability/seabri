import { describe, it, expect } from 'vitest'
import { detectLocale, isSupportedLocale, t } from './lang.js'
import type { Locale } from './lang.js'

describe('detectLocale', () => {
  it('Arabic script → ar', () => expect(detectLocale('مرحبا')).toBe('ar'))
  it('Chinese hanzi → zh', () => expect(detectLocale('你好')).toBe('zh'))
  it('Japanese kana → ja', () => expect(detectLocale('こんにちは')).toBe('ja'))
  it('Korean hangul → ko', () => expect(detectLocale('안녕하세요')).toBe('ko'))
  it('Hindi devanagari → hi', () => expect(detectLocale('नमस्ते')).toBe('hi'))
  it('Cyrillic → ru', () => expect(detectLocale('привет')).toBe('ru'))
  it('Latin text → en (default)', () => expect(detectLocale('Hello')).toBe('en'))
  it('Empty string → en', () => expect(detectLocale('')).toBe('en'))
  it('Whitespace only → en', () => expect(detectLocale('   ')).toBe('en'))
  it('Japanese mixed with Latin → ja when kanji/kana dominates', () => {
    expect(detectLocale('こんにちは世界')).toBe('ja')
  })
  it('Arabic in sentence → ar', () => {
    expect(detectLocale('ما هو خطر الفيضانات في منزلي؟')).toBe('ar')
  })
})

describe('isSupportedLocale', () => {
  it('returns true for en', () => expect(isSupportedLocale('en')).toBe(true))
  it('returns true for ar', () => expect(isSupportedLocale('ar')).toBe(true))
  it('returns true for zh', () => expect(isSupportedLocale('zh')).toBe(true))
  it('returns false for unknown code', () => expect(isSupportedLocale('xx')).toBe(false))
  it('returns false for empty string', () => expect(isSupportedLocale('')).toBe(false))
})

describe('t() message catalog', () => {
  it('en access_denied matches expected string', () => {
    expect(t('access_denied', 'en')).toContain('Access denied')
  })
  it('es access_denied is different from en', () => {
    expect(t('access_denied', 'es')).not.toBe(t('access_denied', 'en'))
  })
  it('es access_denied contains Spanish text', () => {
    expect(t('access_denied', 'es')).toContain('Acceso denegado')
  })
  it('unknown locale falls back to en', () => {
    expect(t('access_denied', 'xx' as Locale)).toBe(t('access_denied', 'en'))
  })
  it('approval_prompt in en contains YES or NO', () => {
    expect(t('approval_prompt', 'en')).toMatch(/YES|NO/)
  })
  it('all locales have all keys defined', () => {
    const locales: Locale[] = ['en', 'es', 'pt', 'fr', 'de', 'ar', 'zh', 'ja', 'ko', 'hi', 'ru', 'tr']
    const keys = ['access_denied', 'approval_prompt', 'approval_expired', 'approved', 'denied', 'unknown_command', 'switched_agent', 'session_started'] as const
    for (const locale of locales) {
      for (const key of keys) {
        const val = t(key, locale)
        expect(val, `${locale}.${key} should be non-empty`).toBeTruthy()
      }
    }
  })
})
