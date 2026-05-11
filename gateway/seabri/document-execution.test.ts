import { describe, expect, it } from 'vitest'
import {
  buildRecoveryDocumentRequest,
  summarizeDocumentStatus,
} from './document-execution.js'

describe('OpenSeaBri document execution helpers', () => {
  it('builds a dry-run recovery signing request by default', () => {
    const request = buildRecoveryDocumentRequest({
      tenantId: 'home-1',
      workflow: 'contractor_approval',
      templateId: 'contractor-approval',
      title: 'Roof Tarp Contractor Approval',
      signer: { name: 'Jordan Homeowner', email: 'jordan@example.com' },
      propertyAddress: '123 Harbor St',
      incidentId: 'incident-1',
    })

    expect(request.dryRun).toBe(true)
    expect(request.signers[0].role).toBe('Homeowner')
    expect(request.metadata.product).toBe('openseabri')
    expect(request.prefillValues.property_address).toBe('123 Harbor St')
  })

  it('summarizes mobile-friendly signing states', () => {
    expect(summarizeDocumentStatus({ dry_run: true })).toBe('Ready for review before sending.')
    expect(summarizeDocumentStatus({ status: 'completed' })).toBe('Completed and ready to file.')
    expect(
      summarizeDocumentStatus({
        signers: [{ signing_url: 'https://sign.example.com/s/abc' }],
      }),
    ).toBe('Sent. Signing link is available.')
  })
})
