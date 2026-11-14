import { retry } from './utils'

function getIdeal() {
  const content = document.getElementById('__NEXT_DATA__')?.textContent
  if (!content) return {}

  const props = JSON.parse(content)?.props
  return {
    csrfToken: props?.initialProps?.csrfToken,
    xToken: props?.pageProps?.initialState?.common?.user?.xToken,
  }
}

async function request(query: string, variables: object, signal?: AbortSignal) {
  const { csrfToken, xToken } = getIdeal()

  const headers = new Headers({
    'content-type': 'application/json',
  })
  if (csrfToken) headers.set('csrf-token', csrfToken)
  if (xToken) headers.set('x-token', xToken)

  const res = await fetch('/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    signal,
  })
  return res.json()
}

const requestWithTimeout = retry(async (query: string, variables: object, timeout: number = 1500) => {
  return request(query, variables, AbortSignal.timeout(timeout))
})

const qnaRequests = new Map<string, (data: unknown) => void>()
const qnaCache = new Map<string, Promise<unknown>>()

let throttled = false
async function selectQnaMany() {
  throttled = false

  const qnaList = await selectMultipleQna([...qnaRequests.keys()])
  for (const id in qnaList) {
    const qna = qnaList[id]
    try {
      qnaRequests.get(id)?.(qna)
    } finally {
      qnaRequests.delete(id)
    }
  }
}

export function selectDiscuss(id: string): Promise<unknown> {
  const cache = qnaCache.get(id)
  if (cache) return cache

  const promise = new Promise(resolve => {
    qnaRequests.set(id, resolve)
  })

  if (!throttled) {
    throttled = true
    setTimeout(selectQnaMany)
  }

  qnaCache.set(id, promise)
  return promise
}

async function selectMultipleQna(id: string[]) {
  const data: Record<string, { seContent: unknown }> = (
    await requestWithTimeout(`query{${
      id.map(id => `_${id}:discuss(id:"${id}"){seContent}`).join('')
    }}`, {})
  ).data

  const entries = Object.entries(data)
  const seContents = entries.map(([id, discuss]) => [id.substring(1), discuss.seContent] as const)

  return Object.fromEntries(seContents)
}
