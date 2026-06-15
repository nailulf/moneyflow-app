/**
 * Shared next-intl mock for transaction-form tests.
 *
 * Returns actual EN strings for the `transactions.form` namespace so
 * assertions like `getByText(/transaction added/i)` continue to match.
 * All other keys fall through to the key itself (matching the pattern used
 * by the rest of the test suite, e.g. account-create-bank.test.tsx).
 */

const EN: Record<string, string> = {
  addTitle: 'Add transaction',
  editTitle: 'Edit transaction',
  back: 'Back',
  save: 'Save',
  done: 'Done',
  addAnother: 'Add another',
  delete: 'Delete',
  confirmDelete: 'Delete',
  cancel: 'Cancel',
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  chooseCategory: 'Choose category',
  chooseAccount: 'Choose account',
  from: 'From',
  to: 'To',
  account: 'Account',
  date: 'Date',
  note: 'Note',
  today: 'Today',
  repeat: 'Repeat',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  ends: 'Ends',
  never: 'Never',
  onDate: 'On date',
  addedTitle: 'Transaction added',
  updatedTitle: 'Transaction updated',
  searchCategory: 'Search',
  searchAccount: 'Search accounts',
  categorySheetTitle: 'Choose category',
  accountSheetDescription: 'Select an account for this transaction',
  categorySheetDescription: 'Select a category for this transaction',
  backspace: 'Backspace',
  uncategorized: 'Uncategorized',
  balanceAdjustment: 'Balance adjustment',
  deleteConfirmTitle: 'Delete transaction?',
  deleteConfirmBody: "This can't be undone.",
  fromAccount: 'From account',
  toAccount: 'To account',
  addNote: 'Add note…',
  amount: 'Amount',
  category: 'Category',
  selectAccount: 'Select account',
  merchant: 'Merchant',
  addMerchant: 'Add merchant…',
  noteOptional: 'Note (optional)',
  recurring: 'Recurring',
  recurringHint: 'Set up a repeat schedule',
  more: 'More',
  saveTransaction: 'Save Transaction',
  'accountType.bank': 'Bank account',
  'accountType.creditCard': 'Credit card',
  'accountType.cash': 'Cash wallet',
  'accountType.digitalWallet': 'Digital wallet',
  'accountType.investment': 'Investment',
  'accountType.property': 'Property',
  'accountType.vehicle': 'Vehicle',
  'accountType.mortgage': 'Mortgage',
}

/**
 * Returns a jest.mock factory for 'next-intl' that resolves
 * `transactions.form` keys to real EN strings.
 *
 * Usage (at the top of a test file, before imports):
 *   jest.mock('next-intl', () => require('./__tests__/.../i18n-mock').nextIntlMock)
 */
export const nextIntlMock = {
  useTranslations: () =>
    (key: string, values?: Record<string, unknown>): string => {
      const raw = EN[key] ?? key
      if (!values) return raw
      // simple {placeholder} interpolation
      return raw.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`))
    },
}
