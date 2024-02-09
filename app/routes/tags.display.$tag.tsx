import {useState, useEffect} from 'react'
import {LoaderFunction} from '@remix-run/cloudflare'
import {Tag as TagType, loadTags} from '~/server-utils/stampy'
import Footer from '~/components/Footer'
import Header from '~/components/Header'
import useToC from '~/hooks/useToC'
import {useLoaderData} from '@remix-run/react'
import {ListTable} from '~/components/Table/ListTable'
import {CategoriesNav} from '~/components/CategoriesNav/Menu'

export const loader = async ({request, params}: Parameters<LoaderFunction>[0]) => {
  const {tag: tagFromUrl} = params
  if (!tagFromUrl) {
    throw Error('missing tag name')
  }

  try {
    const tags = await loadTags(request)
    return {...tags, tagFromUrl}
  } catch (error: unknown) {
    console.error(`error fetching tag "${tagFromUrl}":`, error)
    return {
      error: error?.toString(),
      timestamp: new Date().toISOString(),
      data: new Array<TagType>(),
      tagFromUrl,
    }
  }
}

export const sortFuncs = {
  alphabetically: (a: TagType, b: TagType) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  'by number of questions': (a: TagType, b: TagType) => b.questions.length - a.questions.length,
}

export default function App() {
  const {tagFromUrl, data} = useLoaderData<ReturnType<typeof loader>>()
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null)
  const [tagsFilter, setTagsFilter] = useState<string>('')
  const {toc} = useToC()

  const [sortBy] = useState<keyof typeof sortFuncs>('alphabetically')

  useEffect(() => {
    if (selectedTag === null) {
      const dataForUrlTag = data.filter((tagData) => tagData.name === tagFromUrl)[0]
      setSelectedTag(dataForUrlTag)
    }
  }, [selectedTag, data, tagFromUrl])
  if (selectedTag === null) {
    return null
  }
  return (
    <>
      <Header toc={toc} categories={data} />
      <div className={'top-margin-large'} />
      <main>
        <div className={'group-elements'}>
          <CategoriesNav
            categories={
              data
                .filter((tag) => tag.questions.length > 0)
                .filter((tag) => tag.name.toLowerCase().includes(tagsFilter.toLowerCase()))
                .sort(sortFuncs[sortBy])

              // {title: "AI Safety", id: 1},
            }
            active={selectedTag}
            onClick={setSelectedTag}
            onChange={setTagsFilter}
          />

          {selectedTag === null ? null : (
            <div>
              <h1 style={{marginTop: '0px'}}>{selectedTag.name}</h1>
              {selectedTag.questions.length === 0 ? (
                <div className={'no-questions'}>No questions found</div>
              ) : (
                <p>
                  {selectedTag.questions.length} pages tagged {`"${selectedTag.name}"`}
                </p>
              )}
              {selectedTag && <ListTable elements={selectedTag.questions} />}
            </div>
          )}
        </div>
      </main>

      <div className={'top-margin-large-with-border'} />

      <div className={'top-margin-large'} />

      <Footer />
    </>
  )
}