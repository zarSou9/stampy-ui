import {useState, useEffect, useMemo} from 'react'
import type {MouseEvent} from 'react'
import {useSearchParams, useTransition} from '@remix-run/react'
import type {Question, QuestionState} from '~/stampy'

export const tmpPageId = 999999

const getStateEntries = (state: string): [number, QuestionState][] =>
  Array.from(state.matchAll(/(\d+)(\D+)/g) ?? []).map((groups) => [
    Number(groups[1]),
    groups[2] as QuestionState,
  ])

function updateQuestionMap(question: Question, map: Map<Question['pageid'], Question>): void {
  map.set(question.pageid, question)
  for (const {pageid, title} of question.relatedQuestions) {
    if (!pageid || map.has(pageid)) continue

    map.set(pageid, {title, pageid, text: null, relatedQuestions: []})
  }
}

export default function useQuestionStateInUrl(initialQuestions: Question[]) {
  const [remixSearchParams] = useSearchParams()
  const transition = useTransition()

  const [stateString, setStateString] = useState(() => remixSearchParams.get('state'))
  const [questionMap, setQuestionMap] = useState(() => {
    const initialMap: Map<Question['pageid'], Question> = new Map()
    for (const question of initialQuestions) {
      updateQuestionMap(question, initialMap)
    }
    return initialMap
  })

  useEffect(() => {
    if (transition.location) {
      const state = new URLSearchParams(transition.location.search).get('state')
      setStateString(state)
    }
  }, [transition.location])

  useEffect(() => {
    document.title = stateString ? `Stampy in Test - ${stateString}` : `Stampy (alpha)`
  }, [stateString])

  const initialCollapsedState = useMemo(
    () => initialQuestions.map(({pageid}) => `${pageid}-`).join(''),
    []
  )
  const questions: Question[] = useMemo(() => {
    return getStateEntries(stateString ?? initialCollapsedState).map(([pageid, questionState]) => ({
      pageid,
      title: '...',
      text: null,
      relatedQuestions: [],
      ...questionMap.get(pageid),
      questionState,
    }))
  }, [stateString, questionMap])

  const reset = (event: MouseEvent) => {
    event.preventDefault()
    history.replaceState('', '', '/')
    setStateString(null)
  }

  const toggleQuestion = (questionProps: Question, options?: {moveToTop?: boolean}) => {
    const {pageid, relatedQuestions} = questionProps
    let currentState = stateString ?? initialCollapsedState
    if (options?.moveToTop) {
      const removePageRe = new RegExp(`${pageid}.|${tmpPageId}.`, 'g')
      currentState = `${pageid}-${currentState.replace(removePageRe, '')}`
    }
    const newRelatedQuestions = relatedQuestions.filter(
      (q) => q.pageid && !currentState.includes(q.pageid.toString())
    )
    let newState = getStateEntries(currentState)
      .map(([k, v]) => {
        if (k === pageid) {
          const newValue: QuestionState = v === '_' ? '-' : '_'
          const related = newRelatedQuestions.map((r) => (r.pageid ? `${r.pageid}r` : '')).join('')
          return `${k}${newValue}${related}`
        }
        return `${k}${v}`
      })
      .join('')
    const newSearchParams = new URLSearchParams(remixSearchParams)
    newSearchParams.set('state', newState)
    history.replaceState(newState, '', '?' + newSearchParams.toString())
    setStateString(newState)
  }

  const onLazyLoadQuestion = (question: Question) => {
    setQuestionMap((currentMap) => {
      const newMap = new Map(currentMap)
      updateQuestionMap(question, newMap)
      return newMap
    })
  }

  const selectQuestionByTitle = (title: string) => {
    // if the question is already loaded, move it to top
    for (const q of questionMap.values()) {
      if (title === q.title) {
        toggleQuestion(q, {moveToTop: true})
        return
      }
    }
    // else load new question
    const tmpQuestion = {pageid: tmpPageId, title, text: null, relatedQuestions: []}
    onLazyLoadQuestion(tmpQuestion)
    toggleQuestion(tmpQuestion, {moveToTop: true})

    fetch(`/questions/${encodeURIComponent(title)}`)
      .then((response) => response.json())
      .then((newQuestion: Question) => {
        onLazyLoadQuestion(newQuestion)
        toggleQuestion(newQuestion, {moveToTop: true})
      })
  }

  return {questions, reset, toggleQuestion, onLazyLoadQuestion, selectQuestionByTitle}
}
