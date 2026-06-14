import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Wallet } from 'lucide-react'

import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { FormCard, FormRow } from '@/components/features/accounts/create/FormCard'
import { SegmentedControl } from '@/components/features/accounts/create/SegmentedControl'
import { ToggleSection } from '@/components/features/accounts/create/ToggleSection'
import { InfoBanner } from '@/components/features/accounts/create/InfoBanner'

describe('CreateFlowHeader', () => {
  it('renders title, back button, and a Save submit bound to the form id', () => {
    const onBack = jest.fn()
    render(<CreateFlowHeader title="Bank / Wallet" onBack={onBack} formId="f1" saveLabel="Save" backLabel="Back" />)
    expect(screen.getByRole('heading', { name: 'Bank / Wallet' })).toBeInTheDocument()
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toHaveAttribute('form', 'f1')
    expect(save).toHaveAttribute('type', 'submit')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalled()
  })
  it('omits Save when no formId given', () => {
    render(<CreateFlowHeader title="Add Account" onBack={() => {}} backLabel="Close" />)
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })
})

describe('FormRow', () => {
  it('renders children and an error line when provided', () => {
    render(
      <FormCard>
        <FormRow icon={Wallet} error="Name is required">
          <input aria-label="Account Name" />
        </FormRow>
      </FormCard>
    )
    expect(screen.getByLabelText('Account Name')).toBeInTheDocument()
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })
})

describe('SegmentedControl', () => {
  it('marks the active segment and fires onChange', () => {
    const onChange = jest.fn()
    render(
      <SegmentedControl
        options={[{ value: 'BANK', label: 'Bank Account' }, { value: 'DIGITAL_WALLET', label: 'Digital Wallet' }]}
        value="BANK"
        onChange={onChange}
      />
    )
    expect(screen.getByRole('button', { name: 'Bank Account' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Digital Wallet' }))
    expect(onChange).toHaveBeenCalledWith('DIGITAL_WALLET')
  })
})

describe('ToggleSection', () => {
  it('reveals children only when checked', () => {
    const { rerender } = render(
      <ToggleSection icon={Wallet} iconClasses="bg-tint-green-bg text-tint-green-fg" label="Mortgage Details" checked={false} onCheckedChange={() => {}}>
        <p>loan fields</p>
      </ToggleSection>
    )
    expect(screen.queryByText('loan fields')).not.toBeInTheDocument()
    rerender(
      <ToggleSection icon={Wallet} iconClasses="bg-tint-green-bg text-tint-green-fg" label="Mortgage Details" checked onCheckedChange={() => {}}>
        <p>loan fields</p>
      </ToggleSection>
    )
    expect(screen.getByText('loan fields')).toBeInTheDocument()
  })
})

describe('InfoBanner', () => {
  it('renders info and success variants', () => {
    const { rerender } = render(<InfoBanner variant="info">spending note</InfoBanner>)
    expect(screen.getByText('spending note')).toBeInTheDocument()
    rerender(<InfoBanner variant="success">portfolio note</InfoBanner>)
    expect(screen.getByText('portfolio note')).toBeInTheDocument()
  })
})
