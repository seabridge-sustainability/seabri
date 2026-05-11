export type RecoveryDocumentWorkflow =
  | 'contractor_approval'
  | 'emergency_authorization'
  | 'insurance_authorization'
  | 'fema_support'
  | 'property_inspection_signoff'
  | 'homeowner_acknowledgement'

export interface RecoverySigner {
  name: string
  email?: string
  phone?: string
  role?: string
}

export interface RecoveryDocumentDraft {
  tenantId: string
  workflow: RecoveryDocumentWorkflow
  templateId: string | number
  title: string
  signer: RecoverySigner
  propertyAddress?: string
  incidentId?: string
  claimId?: string
}

export function buildRecoveryDocumentRequest(input: RecoveryDocumentDraft) {
  return {
    tenantId: input.tenantId,
    workflow: input.workflow,
    templateId: input.templateId,
    title: input.title,
    dryRun: true,
    sendEmail: true,
    sendSms: false,
    externalId: input.incidentId ?? input.claimId,
    signers: [
      {
        name: input.signer.name,
        email: input.signer.email,
        phone: input.signer.phone,
        role: input.signer.role ?? 'Homeowner',
      },
    ],
    metadata: {
      product: 'openseabri',
      property_address: input.propertyAddress,
      incident_id: input.incidentId,
      claim_id: input.claimId,
    },
    prefillValues: {
      property_address: input.propertyAddress,
      incident_id: input.incidentId,
      claim_id: input.claimId,
      signer_name: input.signer.name,
    },
  }
}

export function summarizeDocumentStatus(response: {
  status?: string
  dry_run?: boolean
  signers?: Array<{ name?: string; email?: string; status?: string; signing_url?: string }>
  warnings?: string[]
}): string {
  if (response.dry_run) return 'Ready for review before sending.'
  if (response.status === 'completed') return 'Completed and ready to file.'
  if (response.status === 'declined') return 'Declined. Review before resending.'
  const signer = response.signers?.[0]
  if (signer?.signing_url) return 'Sent. Signing link is available.'
  if (response.warnings?.length) return response.warnings[0]
  return 'Pending signature.'
}
