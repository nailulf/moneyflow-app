export interface BankOption {
  id: string
  name: string
  shortName: string
  logo: string
  type: 'bank' | 'ewallet'
}

export const INDONESIAN_BANKS: BankOption[] = [
  // Banks
  { id: 'bca', name: 'Bank BCA', shortName: 'BCA', logo: '🏦', type: 'bank' },
  { id: 'mandiri', name: 'Bank Mandiri', shortName: 'Mandiri', logo: '🏦', type: 'bank' },
  { id: 'bri', name: 'Bank BRI', shortName: 'BRI', logo: '🏦', type: 'bank' },
  { id: 'bni', name: 'Bank BNI', shortName: 'BNI', logo: '🏦', type: 'bank' },
  { id: 'cimb', name: 'CIMB Niaga', shortName: 'CIMB', logo: '🏦', type: 'bank' },
  { id: 'danamon', name: 'Bank Danamon', shortName: 'Danamon', logo: '🏦', type: 'bank' },
  { id: 'permata', name: 'Bank Permata', shortName: 'Permata', logo: '🏦', type: 'bank' },
  { id: 'bsi', name: 'Bank Syariah Indonesia', shortName: 'BSI', logo: '🏦', type: 'bank' },
  { id: 'btn', name: 'Bank BTN', shortName: 'BTN', logo: '🏦', type: 'bank' },
  { id: 'ocbc', name: 'OCBC Indonesia', shortName: 'OCBC', logo: '🏦', type: 'bank' },
  { id: 'panin', name: 'Bank Panin', shortName: 'Panin', logo: '🏦', type: 'bank' },
  { id: 'maybank', name: 'Maybank Indonesia', shortName: 'Maybank', logo: '🏦', type: 'bank' },
  // E-Wallets
  { id: 'gopay', name: 'GoPay', shortName: 'GoPay', logo: '📱', type: 'ewallet' },
  { id: 'ovo', name: 'OVO', shortName: 'OVO', logo: '📱', type: 'ewallet' },
  { id: 'dana', name: 'DANA', shortName: 'DANA', logo: '📱', type: 'ewallet' },
  { id: 'shopeepay', name: 'ShopeePay', shortName: 'ShopeePay', logo: '📱', type: 'ewallet' },
  { id: 'linkaja', name: 'LinkAja', shortName: 'LinkAja', logo: '📱', type: 'ewallet' },
  { id: 'jeniuspay', name: 'Jenius Pay', shortName: 'Jenius', logo: '📱', type: 'ewallet' },
]

export const BANK_GROUPS = {
  bank: INDONESIAN_BANKS.filter(b => b.type === 'bank'),
  ewallet: INDONESIAN_BANKS.filter(b => b.type === 'ewallet'),
}
