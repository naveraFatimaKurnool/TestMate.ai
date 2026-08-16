const SHEET_NAMES = {
  customers: 'Customers tab',
  menu: 'Menu tab',
  orders: 'Orders tab',
  feedback: 'Feedback tab',
}

function escapeSheetName(sheetName) {
  return encodeURIComponent(sheetName)
}

function extractGvizJson(text) {
  const prefix = 'google.visualization.Query.setResponse('
  const start = text.indexOf(prefix)

  if (start === -1) {
    throw new Error(
      'Google Sheets did not return the expected GViz response format.',
    )
  }

  const jsonStart = start + prefix.length
  const jsonEnd = text.lastIndexOf(')')

  if (jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(
      'Invalid Google Sheets GViz response.',
    )
  }

  const jsonText = text
    .slice(jsonStart, jsonEnd)
    .trim()

  try {
    return JSON.parse(jsonText)
  } catch (error) {
    console.error(
      'Failed to parse Google Sheets GViz JSON:',
      error,
    )

    console.error(
      'Response preview:',
      jsonText.slice(0, 1000),
    )

    throw new Error(
      'Google Sheets returned invalid JSON.',
    )
  }
}

function rowToObject(table, row) {
  const record = {}
  const cells = row.c || []

  const columns = Array.isArray(table.cols)
    ? table.cols
    : []

  columns.forEach((column, index) => {
    const key =
      column?.label ||
      column?.id ||
      `column_${index + 1}`

    const cell = cells[index]

    record[key] = cell?.v ?? ''
  })

  return record
}

function rowHasData(record) {
  return Object.values(record).some(
    (value) =>
      String(value ?? '').trim() !== '',
  )
}

async function fetchSheet(sheetId, sheetName) {
  if (!sheetId) {
    throw new Error(
      'Google Sheet ID is missing.',
    )
  }

  if (!sheetName) {
    throw new Error(
      'Google Sheet tab name is missing.',
    )
  }

  const encodedSheetName =
    escapeSheetName(sheetName)

  const url =
    `https://docs.google.com/spreadsheets/d/${sheetId}` +
    `/gviz/tq?tqx=out:json&sheet=${encodedSheetName}`

  console.log('')
  console.log('--------------------------------------')
  console.log(
    `Fetching Google Sheet tab: "${sheetName}"`,
  )
  console.log(
    `Encoded tab name: ${encodedSheetName}`,
  )
  console.log('--------------------------------------')

  let response

  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept:
          'text/plain, application/json;q=0.9, */*;q=0.8',
      },
    })
  } catch (error) {
    console.error(
      `Network error while fetching "${sheetName}":`,
      error,
    )

    throw new Error(
      `Network error while fetching "${sheetName}": ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    )
  }

  console.log(
    `Google Sheets response: ${response.status} ${response.statusText}`,
  )

  if (!response.ok) {
    const errorText = await response.text()

    console.error(
      `Google Sheets request failed for "${sheetName}"`,
    )

    console.error(
      'HTTP status:',
      response.status,
    )

    console.error(
      'Response:',
      errorText.slice(0, 1000),
    )

    throw new Error(
      `Failed to fetch "${sheetName}" from Google Sheets (${response.status}).`,
    )
  }

  const text = await response.text()

  if (!text.trim()) {
    throw new Error(
      `Google Sheets returned an empty response for "${sheetName}".`,
    )
  }

  let payload

  try {
    payload = extractGvizJson(text)
  } catch (error) {
    console.error(
      `Could not parse Google Sheets response for "${sheetName}":`,
      error,
    )

    console.error(
      'Raw response preview:',
      text.slice(0, 1000),
    )

    throw error
  }

  if (payload.status !== 'ok') {
    console.error(
      `Google Sheets returned an error for "${sheetName}":`,
      payload,
    )

    const message =
      payload.errors?.[0]?.detailed_message ||
      payload.errors?.[0]?.message ||
      'Unknown Google Sheets error.'

    throw new Error(
      `Google Sheets error for "${sheetName}": ${message}`,
    )
  }

  const table = payload.table

  if (!table) {
    console.warn(
      `No table returned for "${sheetName}".`,
    )

    return []
  }

  if (!Array.isArray(table.rows)) {
    console.warn(
      `No rows returned for "${sheetName}".`,
    )

    return []
  }

  if (table.rows.length === 0) {
    console.log(
      `"${sheetName}" contains no data rows.`,
    )

    return []
  }

  console.log(
    `"${sheetName}" columns:`,
    table.cols?.map(
      (column) => column.label || column.id,
    ),
  )

  const records = table.rows
    .map((row) =>
      rowToObject(table, row),
    )
    .filter(rowHasData)

  console.log(
    `"${sheetName}" loaded ${records.length} rows.`,
  )

  if (records.length > 0) {
    console.log(
      `"${sheetName}" first record:`,
      records[0],
    )
  }

  return records
}

async function fetchLiveSheetData(sheetId) {
  if (!sheetId) {
    throw new Error(
      'GOOGLE_SHEET_ID is not configured.',
    )
  }

  console.log('')
  console.log('======================================')
  console.log(
    'TasteMate AI - Loading Google Sheets',
  )
  console.log('======================================')

  console.log(
    'Google Sheet ID:',
    sheetId,
  )

  console.log(
    'Configured tabs:',
    SHEET_NAMES,
  )

  try {
    const customers = await fetchSheet(
      sheetId,
      SHEET_NAMES.customers,
    )

    const menu = await fetchSheet(
      sheetId,
      SHEET_NAMES.menu,
    )

    const orders = await fetchSheet(
      sheetId,
      SHEET_NAMES.orders,
    )

    const feedback = await fetchSheet(
      sheetId,
      SHEET_NAMES.feedback,
    )

    const result = {
      customers,
      menu,
      orders,
      feedback,
    }

    console.log('')
    console.log('======================================')
    console.log(
      'Google Sheets loaded successfully',
    )
    console.log('======================================')

    console.log(
      `Customers: ${customers.length} rows`,
    )

    console.log(
      `Menu: ${menu.length} rows`,
    )

    console.log(
      `Orders: ${orders.length} rows`,
    )

    console.log(
      `Feedback: ${feedback.length} rows`,
    )

    console.log('======================================')
    console.log('')

    return result
  } catch (error) {
    console.error('')
    console.error('======================================')
    console.error(
      'GOOGLE SHEETS LOADING FAILED',
    )
    console.error('======================================')

    console.error(
      error instanceof Error
        ? error.message
        : error,
    )

    console.error('======================================')
    console.error('')

    throw error
  }
}

export {
  SHEET_NAMES,
  fetchLiveSheetData,
}