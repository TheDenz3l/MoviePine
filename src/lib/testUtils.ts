// Quick fix for UUID issue
export function generateTestUUID(token: string): string {
  const timestamp = token.split('-')[2] || '1234567890123'
  return '00000000-0000-4000-8000-' + timestamp.padStart(12, '0').slice(0, 12)
}

export function getTestUser(token: string) {
  return {
    id: generateTestUUID(token),
    email: 'test@example.com'
  }
}
