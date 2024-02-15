import type {LoaderFunction} from '@remix-run/cloudflare'
import {reloadInBackgroundIfNeeded} from '~/server-utils/kv-cache'
import {loadAllQuestions, Question, PageId} from '~/server-utils/stampy'

const MAX_LEVELS = 3
export const INTRODUCTORY = 'Introductory'
export const ADVANCED = 'Advanced'

export type Category = typeof INTRODUCTORY | typeof ADVANCED | undefined

export type TOCItem = {
  title: string
  subtitle?: string
  pageid: PageId
  icon?: string
  hasText: boolean
  children?: TOCItem[]
  category?: Category
}
type LoaderResp = {
  data: TOCItem[]
  timestamp: string
}

const getCategory = (tags: string[]): Category => {
  if (!tags) return undefined
  if (tags.includes(INTRODUCTORY)) return INTRODUCTORY
  if (tags.includes(ADVANCED)) return ADVANCED
  return undefined
}

const formatQuestion =
  (level: number) =>
  ({title, pageid, subtitle, icon, children, text, tags}: Question): TOCItem => ({
    title,
    subtitle: subtitle ? subtitle : undefined,
    pageid,
    icon: icon ? icon : undefined,
    hasText: !!text,
    children: level < MAX_LEVELS ? children?.map(formatQuestion(level + 1)) : undefined,
    category: getCategory(tags),
  })

const getToc = async (request: any) => {
  try {
    return await loadAllQuestions(request)
  } catch (e) {
    console.error(e)
    throw new Response('Could not fetch table of contents', {status: 500})
  }
}

export const loadToC = async (request: any): Promise<LoaderResp> => {
  const {data, timestamp} = await getToc(request)
  const items = data.reduce((acc, item) => ({...acc, [item.title]: item}), {}) as {
    [k: string]: Question
  }
  data
    .filter(({parents}) => parents && parents.length > 0)
    .forEach((item) => {
      item?.parents?.forEach((name) => {
        const parent = items[name]
        if (!parent.children) {
          parent['children'] = []
        }
        parent.children.push(item)
      })
    })
  return {
    data: data
      .filter(({parents, children}) => parents && parents.length === 0 && children)
      .map(formatQuestion(1)),
    timestamp,
  }
}
export const loader = async ({request}: Parameters<LoaderFunction>[0]): Promise<LoaderResp> =>
  loadToC(request)

export function fetchTOC() {
  const url = `/questions/toc`
  return fetch(url).then(async (response) => {
    const {data, timestamp}: Awaited<LoaderResp> = await response.json()
    const backgroundPromiseIfReloaded: LoaderResp | Promise<void> = reloadInBackgroundIfNeeded(
      url,
      timestamp
    )

    return {data, backgroundPromiseIfReloaded}
  })
}
