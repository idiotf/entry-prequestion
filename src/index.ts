import { selectDiscuss } from './request'

function visitQnaList(list: Element) {
  for (const child of list.children) {
    if (child.querySelector('.qna-preview')) continue
    const anchor = child.firstElementChild
    if (!(anchor instanceof HTMLAnchorElement)) continue

    const qnaId = anchor.href.match(/\/community\/qna\/([0-9a-f]{24})/)?.[1]
    if (!qnaId) continue

    visitQnaItem(anchor, qnaId)
  }
}

const isObject = (value: unknown) => !!(typeof value == 'object' && value)

function parseSeContent(content: unknown) {
  if (
    isObject(content) && 'document' in content &&
    isObject(content.document) && 'components' in content.document &&
    Array.isArray(content.document.components)
  ) return content.document.components.map((comp: unknown) => {
    if (
      isObject(comp) && 'value' in comp &&
      Array.isArray(comp.value)
    ) return comp.value.map(v => {
      if (
        isObject(v) && 'nodes' in v &&
        Array.isArray(v.nodes)
      ) return v.nodes.map(n => n?.value || '').join('')

      return ''
    }).join('\n')

    return ''
  }).join('\n')

  return ''
}

function visitQnaItem(container: Element, id: string) {
  const preview = document.createElement('div')
  preview.className = 'qna-preview'
  Object.assign(preview.style, {
    color: 'gray',
    position: 'relative',
    top: '6px',
    minHeight: '1em',
    overflow: 'hidden',
    textWrap: 'nowrap',
    textOverflow: 'ellipsis',
  })
  container.insertBefore(preview, container.firstChild?.nextSibling || null)

  const content = selectDiscuss(id)
  content.then(content => preview.textContent = parseSeContent(content))
}

const observer = new MutationObserver(() => {
  const qnaList = document.querySelector('.nextInner section > div > div > ul')
  if (qnaList) visitQnaList(qnaList)
})

// Supporting for XML documents
if (document.body) {
  observer.observe(document.body, { subtree: true, childList: true })
}
