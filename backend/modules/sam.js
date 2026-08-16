export const samMetadata = {
  name: 'Sam',
  role: 'Restaurant Marketing Communicator',
  description:
    'Transforms the product strategy into customer-facing communication and engagement recommendations.',
}

export async function getSamMarketingBrief(alexBrief) {
  if (!alexBrief || typeof alexBrief !== 'object') {
    throw new Error('Sam requires a valid Alex product brief.')
  }

  const productGoals = Array.isArray(alexBrief.productGoals)
    ? alexBrief.productGoals
    : []

  const customerRequirements = Array.isArray(
    alexBrief.customerRequirements,
  )
    ? alexBrief.customerRequirements
    : []

  const productOpportunities = Array.isArray(
    alexBrief.productOpportunities,
  )
    ? alexBrief.productOpportunities
    : []

  const coreFeatures = Array.isArray(alexBrief.coreFeatures)
    ? alexBrief.coreFeatures
    : []

  const recommendationsForSam = Array.isArray(
    alexBrief.recommendationsForSam,
  )
    ? alexBrief.recommendationsForSam
    : []

  const messages = []

  if (productGoals.length > 0) {
    messages.push(
      `Communicate the main customer value clearly: ${productGoals[0]}`,
    )
  }

  if (customerRequirements.length > 0) {
    messages.push(
      `Address the customer need: ${customerRequirements[0]}`,
    )
  }

  if (productOpportunities.length > 0) {
    messages.push(
      `Highlight the opportunity: ${productOpportunities[0]}`,
    )
  }

  const recommendedFeatures = coreFeatures
    .slice(0, 3)
    .map((feature) => feature.feature)

  return {
    agent: 'Sam',
    role: 'Restaurant Marketing Communicator',
    generatedAt: new Date().toISOString(),

    sourceAgent: 'Alex',

    summary:
      'Sam has transformed Alex’s product strategy into customer-facing restaurant communication recommendations.',

    communicationGoals: [
      'Explain the value of the experience in simple customer-friendly language.',
      'Encourage customers to engage with personalised restaurant recommendations.',
      'Maintain a welcoming and trustworthy tone.',
      'Connect the AI experience with the restaurant brand and service journey.',
    ],

    targetAudience: [
      'Existing restaurant customers',
      'Customers exploring menu options',
      'Customers who may benefit from personalised recommendations',
    ],

    keyMessages: messages,

    recommendedFeatures,

    customerMessages: [
      'Discover recommendations designed around your dining preferences.',
      'Find menu choices that better match what you are looking for.',
      'Get a more personalised restaurant experience without making the process complicated.',
    ],

    engagementChannels: [
      {
        channel: 'In-app experience',
        purpose:
          'Present personalised recommendations while the customer is choosing what to order.',
      },
      {
        channel: 'Restaurant website',
        purpose:
          'Introduce the TasteMate AI experience and explain its customer value.',
      },
      {
        channel: 'Email',
        purpose:
          'Share personalised recommendations and encourage customers to return.',
      },
      {
        channel: 'Restaurant staff',
        purpose:
          'Support the customer journey by reinforcing recommendations when appropriate.',
      },
    ],

    campaignIdeas: [
      {
        campaign: 'Discover Your Taste',
        message:
          'Let TasteMate help you discover menu choices that match your preferences.',
      },
      {
        campaign: 'Your Next Favourite',
        message:
          'Find something new based on what you already enjoy.',
      },
      {
        campaign: 'A More Personal Dining Experience',
        message:
          'Make your next restaurant visit feel more tailored to you.',
      },
    ],

    recommendationsForDaniel: [
      ...recommendationsForSam,
      'Ensure customer-facing messages are simple enough for restaurant staff to explain.',
      'Avoid promising recommendations that the restaurant cannot operationally support.',
      'Keep the customer experience helpful rather than intrusive.',
    ],
  }
}