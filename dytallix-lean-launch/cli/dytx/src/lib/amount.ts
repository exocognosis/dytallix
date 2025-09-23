export function amountToMicro(input: string | number): string {
  if (input === null || input === undefined) {
    throw new Error('Amount is required')
  }
  const amountStr = typeof input === 'number' ? input.toString() : input.trim()
  if (!/^(\d+)(\.\d+)?$/.test(amountStr)) {
    throw new Error('Amount must be a positive decimal number')
  }
  const [wholePart, fractionalPart = ''] = amountStr.split('.')
  if (fractionalPart.length > 6) {
    throw new Error('Amount precision cannot exceed 6 decimal places (micro units)')
  }
  const normalizedFraction = (fractionalPart + '000000').slice(0, 6)
  const whole = BigInt(wholePart || '0') * BigInt(1_000_000)
  const fraction = BigInt(normalizedFraction)
  return (whole + fraction).toString()
}
