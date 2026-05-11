// Worked claim examples used in the Claude system prompt as few-shot demonstrations.
// These illustrate correct field extraction and SIU flag detection.

export const CLAIM_EXAMPLES = [
  {
    scenario: 'Straightforward water damage',
    conversation: [
      { role: 'agent', content: "Hello! I'm sorry to hear something happened. Can I get your policy number to get started?" },
      { role: 'claimant', content: 'Sure, it is HO-2024-88821. My name is Maria Santos.' },
      { role: 'agent', content: 'Thank you, Maria. Can you briefly describe what happened?' },
      {
        role: 'claimant',
        content:
          'The pipe under the kitchen sink burst last night, around 11 PM. Water flooded the kitchen and part of the living room. I shut off the main valve.',
      },
    ],
    expectedPacket: {
      claimType: 'HOME_WATER',
      claimantName: 'Maria Santos',
      policyNumber: 'HO-2024-88821',
      lossDescription: 'Burst pipe under kitchen sink flooded kitchen and part of living room. Claimant shut off main valve.',
      siuFlags: [],
    },
    expectedNextBestQuestion:
      'Has a plumber or water damage restoration company been contacted yet?',
  },
  {
    scenario: 'Auto collision with injuries',
    conversation: [
      { role: 'agent', content: 'Good afternoon! Please go ahead and describe what happened.' },
      {
        role: 'claimant',
        content:
          "I was rear-ended on the I-95 this morning around 8 AM. The other driver ran a red light. My neck really hurts. My policy number is AU-5533-K.",
      },
    ],
    expectedPacket: {
      claimType: 'AUTO_COLLISION',
      policyNumber: 'AU-5533-K',
      injuriesReported: true,
      siuFlags: [],
    },
    expectedNextBestQuestion:
      'Have you sought medical attention for your neck injury yet? I can provide you with our 24/7 nurse line.',
  },
  {
    scenario: 'Home theft with SIU signals',
    conversation: [
      { role: 'agent', content: "I'm sorry to hear about this. Can you describe what was stolen?" },
      {
        role: 'claimant',
        content:
          'All my jewellery — about $80,000 worth — was taken. I just upgraded my policy last month to add jewellery coverage. I noticed two weeks ago but just now got around to reporting it.',
      },
    ],
    expectedPacket: {
      claimType: 'HOME_THEFT',
      estimatedValue: 80000,
      siuFlags: ['RECENT_POLICY_CHANGE', 'DELAYED_REPORT'],
    },
    expectedNextBestQuestion:
      'Was a police report filed? If so, can you provide the report number?',
  },
  {
    scenario: 'Travel cancellation — straightforward',
    conversation: [
      { role: 'agent', content: "I'm sorry your trip was disrupted. What policy number are you calling about?" },
      {
        role: 'claimant',
        content:
          'TR-77412. We were supposed to fly to Paris on June 15 but my father was hospitalised two days before, so we had to cancel everything. We lost about $6,200 in non-refundable bookings.',
      },
    ],
    expectedPacket: {
      claimType: 'TRAVEL_CANCELLATION',
      policyNumber: 'TR-77412',
      estimatedValue: 6200,
      siuFlags: [],
    },
    expectedNextBestQuestion:
      'Do you have a physician letter or hospital admission document confirming your father\'s hospitalisation?',
  },
  {
    scenario: 'Auto theft with multiple SIU signals',
    conversation: [
      { role: 'agent', content: 'Please describe what happened to your vehicle.' },
      {
        role: 'claimant',
        content:
          "My car was stolen from the airport parking lot last Tuesday. I have three other cars insured and this is the newest one — a 2024 BMW I just got. I didn't file a police report because I figured insurance would handle it. I want a cash settlement today.",
      },
    ],
    expectedPacket: {
      claimType: 'AUTO_THEFT',
      siuFlags: ['NO_POLICE_REPORT', 'MULTIPLE_VEHICLES_INSURED', 'CASH_SETTLEMENT_DEMAND'],
    },
    expectedNextBestQuestion:
      'Before we proceed, a police report is required for vehicle theft claims. Can you file one now at the nearest precinct or online?',
  },
  {
    scenario: 'Medical expense claim abroad',
    conversation: [
      { role: 'agent', content: 'I understand you had a medical emergency while travelling. Please go ahead.' },
      {
        role: 'claimant',
        content:
          "I was in Bangkok on business when I had an appendicitis attack on March 3rd. I was admitted to Bumrungrad International Hospital for three days. My policy is ME-2024-4421. The bills are around $12,000.",
      },
    ],
    expectedPacket: {
      claimType: 'TRAVEL_MEDICAL',
      policyNumber: 'ME-2024-4421',
      dateOfLoss: '2024-03-03',
      locationOfLoss: 'Bumrungrad International Hospital, Bangkok, Thailand',
      estimatedValue: 12000,
      siuFlags: [],
    },
    expectedNextBestQuestion:
      'Do you have the itemised hospital bill and any discharge summary from Bumrungrad International?',
  },
]
