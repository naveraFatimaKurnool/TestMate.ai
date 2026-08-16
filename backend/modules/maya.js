import { fetchLiveSheetData } from '../lib/googleSheets.js'

const metadata = {
  id: 'maya',
  name: 'Maya',
  role: 'Food Insights Researcher',
  status: 'ready',
  description:
    'Analyses customer, menu, order and feedback data to identify customer needs and opportunities.',
}

const positiveKeywords = [
  'good',
  'great',
  'excellent',
  'love',
  'loved',
  'delicious',
  'fresh',
  'friendly',
  'fast',
  'helpful',
  'amazing',
  'tasty',
  'wonderful',
]

const negativeKeywords = [
  'bad',
  'slow',
  'cold',
  'late',
  'long wait',
  'expensive',
  'pricey',
  'poor',
  'unfriendly',
  'disappointed',
  'issue',
  'problem',
  'complaint',
  'missing',
]

const complaintThemes = [
  { theme: 'wait time or slow service', keywords: ['wait', 'waiting', 'slow', 'delay', 'late'] },
  { theme: 'pricing or value concerns', keywords: ['price', 'priced', 'expensive', 'value', 'cost'] },
  { theme: 'portion or quantity concerns', keywords: ['portion', 'size', 'small', 'quantity', 'serving'] },
  { theme: 'food temperature or freshness', keywords: ['cold', 'hot', 'warm', 'fresh', 'stale'] },
  { theme: 'service quality concerns', keywords: ['service', 'staff', 'rude', 'helpful', 'friendly'] },
]

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function unique(array) {
  return [...new Set(array)]
}

function collectFields(records) {
  const fields = new Map()

  for (const record of records) {
    if (!isPlainObject(record)) {
      continue
    }

    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = normalizeText(key)
      if (!fields.has(normalizedKey)) {
        fields.set(normalizedKey, [])
      }
      fields.get(normalizedKey).push(value)
    }
  }

  return fields
}

function getValueByKeywords(record, keywords) {
  const entries = Object.entries(record)
  for (const [key, value] of entries) {
    const normalizedKey = normalizeText(key)
    if (keywords.some((keyword) => normalizedKey.includes(keyword))) {
      return value
    }
  }
  return ''
}

function getFieldValuesByKeywords(record, keywords) {
  return Object.entries(record)
    .filter(([key]) => {
      const normalizedKey = normalizeText(key)
      return keywords.some((keyword) => normalizedKey.includes(keyword))
    })
    .map(([, value]) => String(value ?? '').trim())
    .filter(Boolean)
}

function getTextFields(record) {
  return Object.values(record)
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const cleaned = String(value).replace(/[^0-9.-]/g, '').trim()
  if (!cleaned) {
    return null
  }

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function formatList(items) {
  return items.length > 0 ? items.join(', ') : 'none observed'
}

function countByValue(values) {
  const counts = new Map()
  for (const value of values) {
    const key = normalizeText(value)
    if (!key) {
      continue
    }
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
}

function pickTopCounts(counts, limit = 3) {
  return counts.slice(0, limit)
}

function topStrings(counts, limit = 3) {
  return pickTopCounts(counts, limit).map((entry) => `${entry.value} (${entry.count})`)
}

function getSheetSignature(records) {
  const firstRecord = records.find((record) => isPlainObject(record))
  if (!firstRecord) {
    return ''
  }

  return Object.keys(firstRecord)
    .map((key) => normalizeText(key))
    .sort()
    .join('|')
}

function hasSharedSchemaAcrossSheets(data) {
  const signatures = [data.customers, data.menu, data.orders, data.feedback].map(getSheetSignature)
  return signatures.every((signature) => signature.length > 0 && signature === signatures[0])
}

function addFinding(findings, finding, evidence, importance) {
  findings.push({ finding, evidence, importance })
}

function extractCustomerStats(customers) {
  const customerCount = customers.length
  const cuisineValues = []
  const dietValues = []
  const budgetValues = []
  const spiceValues = []
  const categoryValues = []

  for (const customer of customers) {
    if (!isPlainObject(customer)) {
      continue
    }

    const cuisineValue = getValueByKeywords(customer, ['cuisine', 'food preference', 'preference'])
    const dietValue = getValueByKeywords(customer, ['diet', 'dietary', 'vegan', 'vegetarian', 'halal', 'kosher', 'allergy', 'allergen'])
    const budgetValue = getValueByKeywords(customer, ['budget', 'spend', 'price', 'value'])
    const spiceValue = getValueByKeywords(customer, ['spice'])
    const categoryValue = getValueByKeywords(customer, ['category', 'favourite', 'favorite'])

    if (cuisineValue) {
      cuisineValues.push(cuisineValue)
    }

    if (dietValue) {
      dietValues.push(dietValue)
    }

    if (budgetValue) {
      budgetValues.push(budgetValue)
    }

    if (spiceValue) {
      spiceValues.push(spiceValue)
    }

    if (categoryValue) {
      categoryValues.push(categoryValue)
    }
  }

  return {
    customerCount,
    cuisineCounts: countByValue(cuisineValues),
    dietCounts: countByValue(dietValues),
    budgetCounts: countByValue(budgetValues),
    spiceCounts: countByValue(spiceValues),
    categoryCounts: countByValue(categoryValues),
  }
}

function extractMenuStats(menu) {
  const items = []
  const categories = []

  for (const row of menu) {
    if (!isPlainObject(row)) {
      continue
    }

    const itemName = getValueByKeywords(row, ['item', 'items', 'dish', 'menu', 'name'])
    const categoryValue = getValueByKeywords(row, ['category', 'cuisine', 'type'])

    if (itemName) {
      items.push(itemName)
    }

    if (categoryValue) {
      categories.push(categoryValue)
    }
  }

  return {
    supported: items.length > 0,
    itemCounts: countByValue(items),
    categoryCounts: countByValue(categories),
  }
}

function extractOrderStats(orders) {
  const itemMentions = []
  const customerRefs = []
  const orderValues = []
  const orderIdentifiers = []

  for (const order of orders) {
    if (!isPlainObject(order)) {
      continue
    }

    const itemValue = getValueByKeywords(order, ['item', 'items', 'dish', 'menu'])
    const customerValue = getValueByKeywords(order, ['customer', 'customer name'])
    const amountValue = getValueByKeywords(order, ['total', 'amount', 'value', 'price', 'cost', 'bill', 'spend'])
    const orderIdValue = getValueByKeywords(order, ['order id', 'transaction', 'receipt'])

    if (itemValue) {
      const splitItems = String(itemValue)
        .split(/[|,/;&]+/)
        .map((part) => part.trim())
        .filter(Boolean)
      itemMentions.push(...(splitItems.length > 0 ? splitItems : [itemValue]))
    }

    if (customerValue) {
      customerRefs.push(customerValue)
    }

    if (orderIdValue) {
      orderIdentifiers.push(orderIdValue)
    }

    const amount = toNumber(amountValue)
    if (amount !== null) {
      orderValues.push(amount)
    }
  }

  return {
    supported: itemMentions.length > 0 || orderValues.length > 0 || orderIdentifiers.length > 0,
    itemCounts: countByValue(itemMentions),
    customerCounts: countByValue(customerRefs),
    orderValues,
  }
}

function extractFeedbackStats(feedback) {
  const texts = feedback.flatMap((row) => {
    if (!isPlainObject(row)) {
      return []
    }

    const feedbackText = getFieldValuesByKeywords(row, ['feedback', 'review', 'comment', 'message', 'note']).join(' ')

    return feedbackText ? [String(feedbackText)] : []
  })

  const lowerTexts = texts.map((text) => normalizeText(text))

  const positiveMentions = lowerTexts.filter((text) => positiveKeywords.some((keyword) => text.includes(keyword))).length
  const negativeMentions = lowerTexts.filter((text) => negativeKeywords.some((keyword) => text.includes(keyword))).length

  const complaintThemeCounts = complaintThemes
    .map((theme) => {
      const count = lowerTexts.filter((text) => theme.keywords.some((keyword) => text.includes(keyword))).length
      return { theme: theme.theme, count }
    })
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.theme.localeCompare(right.theme))

  const complaintKeywords = ['wait', 'slow', 'price', 'expensive', 'cold', 'fresh', 'service', 'staff', 'portion']
  const repeatedComplaints = lowerTexts
    .filter((text) => complaintKeywords.some((keyword) => text.includes(keyword)))
    .map((text) => text)

  return {
    supported: texts.length > 0,
    texts,
    positiveMentions,
    negativeMentions,
    complaintThemeCounts,
    repeatedComplaints,
  }
}

function buildSummary(data, derived) {
  const parts = []

  parts.push(`Maya reviewed ${derived.customerCount} customer records, ${data.menu.length} menu rows, ${data.orders.length} orders, and ${data.feedback.length} feedback entries from the live Google Sheet.`)

  if (derived.topCustomerPreferences.length > 0) {
    parts.push(`The clearest preference signals are ${formatList(derived.topCustomerPreferences)}.`)
  } else {
    parts.push('The customer sheet does not provide enough evidence to isolate preference patterns confidently.')
  }

  if (derived.sharedSchemaAcrossSheets) {
    parts.push('The live tabs currently share the same preference-style schema, so menu, order, and feedback-specific evidence is limited.')
  } else {
    parts.push('Some secondary tabs expose distinct evidence types, but not all requested signals are present in the live data.')
  }

  return parts.join(' ')
}

function buildResearchBrief(data) {
  const customerStats = extractCustomerStats(data.customers)
  const menuStats = extractMenuStats(data.menu)
  const orderStats = extractOrderStats(data.orders)
  const feedbackStats = extractFeedbackStats(data.feedback)
  const sharedSchemaAcrossSheets = hasSharedSchemaAcrossSheets(data)

  const findings = []

  addFinding(
    findings,
    'Total customer records are available for the current live sheet.',
    `Customers tab contains ${customerStats.customerCount} rows.`,
    'high',
  )

  if (customerStats.cuisineCounts.length > 0) {
    addFinding(
      findings,
      'Cuisine preference patterns appear in the customer data.',
      `Top cuisine or preference values: ${formatList(pickTopCounts(customerStats.cuisineCounts).map((entry) => `${entry.value} (${entry.count})`))}.`,
      'medium',
    )
  } else {
    addFinding(
      findings,
      'Cuisine preference patterns are not clearly supported by the current customer sheet.',
      'No reliably named cuisine-preference field was found in the live customer records.',
      'low',
    )
  }

  if (customerStats.budgetCounts.length > 0) {
    addFinding(
      findings,
      'Budget preference patterns are visible in the customer data.',
      `Top budget values: ${formatList(topStrings(customerStats.budgetCounts))}.`,
      'medium',
    )
  } else {
    addFinding(
      findings,
      'Budget preference patterns are not strongly supported by the current customer sheet.',
      'The live customer data does not expose a clear budget-preference field with enough consistency.',
      'low',
    )
  }

  if (customerStats.spiceCounts.length > 0) {
    addFinding(
      findings,
      'Spice preference patterns are visible in the customer data.',
      `Top spice values: ${formatList(topStrings(customerStats.spiceCounts))}.`,
      'medium',
    )
  }

  if (customerStats.categoryCounts.length > 0) {
    addFinding(
      findings,
      'Favourite category patterns are visible in the customer data.',
      `Top favourite categories: ${formatList(topStrings(customerStats.categoryCounts))}.`,
      'medium',
    )
  }

  if (customerStats.dietCounts.length > 0) {
    addFinding(
      findings,
      'Dietary preference patterns are visible in the customer data.',
      `Top dietary values: ${formatList(topStrings(customerStats.dietCounts))}.`,
      'medium',
    )
  } else {
    addFinding(
      findings,
      'Dietary preference patterns are not strongly supported by the current customer sheet.',
      'The live customer data does not expose a clear dietary-preference field with enough consistency.',
      'low',
    )
  }

  if (menuStats.supported && menuStats.itemCounts.length > 0) {
    addFinding(
      findings,
      'Some menu items appear more frequently in the live order/menu data.',
      `Most-mentioned items: ${formatList(topStrings(menuStats.itemCounts))}.`,
      'high',
    )
  } else {
    addFinding(
      findings,
      'Popular menu items cannot yet be identified confidently.',
      'The live menu sheet does not expose enough item-specific labels for a reliable ranking.',
      'medium',
    )
  }

  if (orderStats.supported && orderStats.customerCounts.length > 0) {
    addFinding(
      findings,
      'Order frequency varies across customers.',
      `Most active customer references: ${formatList(topStrings(orderStats.customerCounts))}.`,
      'medium',
    )
  } else {
    addFinding(
      findings,
      'Order frequency cannot be linked to individual customers with confidence.',
      'No dependable order-specific identifier was available in the live order rows for a repeat-order comparison.',
      'low',
    )
  }

  if (orderStats.supported && orderStats.orderValues.length > 0) {
    const total = orderStats.orderValues.reduce((sum, value) => sum + value, 0)
    const average = total / orderStats.orderValues.length
    addFinding(
      findings,
      'Order-value patterns are available in the live data.',
      `Observed ${orderStats.orderValues.length} numeric order values with an average of ${average.toFixed(2)} and a range from ${Math.min(...orderStats.orderValues).toFixed(2)} to ${Math.max(...orderStats.orderValues).toFixed(2)}.`,
      'medium',
    )
  } else {
    addFinding(
      findings,
      'Order-value patterns cannot be calculated from the current sheet.',
      'The live order data does not expose a reliable numeric amount, total, or spend field.',
      'low',
    )
  }

  if (feedbackStats.supported && (feedbackStats.positiveMentions > 0 || feedbackStats.negativeMentions > 0)) {
    addFinding(
      findings,
      'Feedback contains both positive and negative signals.',
      `Positive language appears ${feedbackStats.positiveMentions} times and negative language appears ${feedbackStats.negativeMentions} times across the current feedback entries.`,
      'high',
    )
  } else {
    addFinding(
      findings,
      'Feedback sentiment is not strong enough for a reliable directional read.',
      'The live feedback data does not expose enough clear feedback text to support a confident positive/negative split.',
      'medium',
    )
  }

  if (feedbackStats.supported && feedbackStats.complaintThemeCounts.length > 0) {
    addFinding(
      findings,
      'Repeated customer complaints cluster around specific themes.',
      `Most recurring complaint themes: ${formatList(feedbackStats.complaintThemeCounts.slice(0, 3).map((entry) => `${entry.theme} (${entry.count})`))}.`,
      'high',
    )
  } else {
    addFinding(
      findings,
      'Repeated customer complaints are not strongly evident.',
      'The live feedback sheet does not expose a repeated complaint theme often enough to support a confident cluster.',
      'low',
    )
  }

  if (sharedSchemaAcrossSheets) {
    addFinding(
      findings,
      'The live sheets currently share the same preference-style schema.',
      'All four tabs appear to expose the same CustomerID, CuisinePreference, DietaryPreference, BudgetPreference, SpicePreference, and FavouriteCategory fields, so sheet-specific menu, order, and feedback signals are limited.',
      'medium',
    )
  }

  const topCustomerPreferences = [
    ...topStrings(customerStats.cuisineCounts, 2).map((value) => `cuisine: ${value}`),
    ...topStrings(customerStats.dietCounts, 2).map((value) => `diet: ${value}`),
    ...topStrings(customerStats.budgetCounts, 1).map((value) => `budget: ${value}`),
    ...topStrings(customerStats.spiceCounts, 1).map((value) => `spice: ${value}`),
    ...topStrings(customerStats.categoryCounts, 1).map((value) => `category: ${value}`),
  ]

  const customerNeeds = unique([
    customerStats.cuisineCounts.length > 0 ? 'Cuisine-aligned suggestions that respect the strongest customer preferences' : 'Better tracking of cuisine preferences in the live sheet',
    customerStats.dietCounts.length > 0 ? 'Diet-aware menu guidance and customer messaging' : 'Clearer dietary-preference capture before deeper segmentation',
    customerStats.budgetCounts.length > 0 ? 'Budget-sensitive recommendations that match observed preference bands' : 'More complete spend or budget-style data for pricing analysis',
    customerStats.spiceCounts.length > 0 ? 'Spice-level guidance that matches the strongest customer preferences' : 'Clearer spice-preference capture before deeper segmentation',
    customerStats.categoryCounts.length > 0 ? 'Category-aware suggestions aligned with favourite dishes or course types' : 'Better favourite-category capture in the live sheet',
  ])

  const opportunities = unique([
    customerStats.cuisineCounts.length > 0 ? 'Personalize recommendations around the strongest cuisine preference clusters' : 'Segment future customers once cuisine fields become clearer',
    customerStats.budgetCounts.length > 0 ? 'Shape offers around the strongest budget bands before the next engagement step' : 'Collect more complete pricing data before value-based targeting',
    feedbackStats.complaintThemeCounts.length > 0 ? 'Address the leading complaint theme before launching the next engagement step' : 'Collect more structured feedback to identify operational opportunities',
  ])

  const recommendationsForNextAgent = unique([
    'Use the strongest preference clusters to shape experience concepts and menu positioning.',
    feedbackStats.complaintThemeCounts.length > 0
      ? `Prioritise the main complaint theme (${feedbackStats.complaintThemeCounts[0].theme}) in the next design pass.`
      : 'Treat complaint analysis as tentative until more structured feedback is available.',
    customerStats.budgetCounts.length > 0
      ? 'Consider value-tiered engagement ideas if the budget pattern is consistent across the sample.'
      : 'Avoid spend-based assumptions until pricing or budget patterns become more reliable.',
  ])

  return {
    agent: metadata.name,
    role: metadata.role,
    generatedAt: new Date().toISOString(),
    dataSource: 'Live Google Sheet',
    summary: buildSummary(data, {
      customerCount: customerStats.customerCount,
      topCustomerPreferences,
      sharedSchemaAcrossSheets,
    }),
    keyFindings: findings,
    customerNeeds,
    opportunities,
    recommendationsForNextAgent,
  }
}

async function getMayaResearchBrief() {
  const data = await fetchLiveSheetData(process.env.GOOGLE_SHEET_ID)
  return buildResearchBrief(data)
}

export { getMayaResearchBrief, metadata as mayaMetadata }