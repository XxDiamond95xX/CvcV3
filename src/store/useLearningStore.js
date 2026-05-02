import { create } from 'zustand'
import courseData from '@/data/courses.json'
import waterTankChapter from '@/data/waterTankChapter'

function insertWaterTankChapter(chapters) {
  const alreadyExists = chapters.some((chapter) => chapter.id === waterTankChapter.id)
  if (alreadyExists) return chapters

  const insertionIndex = chapters.findIndex((chapter) => {
    const searchableText = `${chapter.title ?? ''} ${chapter.content ?? ''}`.toLowerCase()
    return searchableText.includes('continuous cooling')
  })

  const targetIndex = insertionIndex >= 0 ? insertionIndex + 1 : chapters.length

  return [
    ...chapters.slice(0, targetIndex),
    waterTankChapter,
    ...chapters.slice(targetIndex)
  ]
}

const modules = courseData.modules.map((module, index) => {
  if (index !== 0) {
    return {
      ...module,
      chapters: [...module.chapters]
    }
  }

  return {
    ...module,
    chapters: insertWaterTankChapter(module.chapters)
  }
})

const firstModule = modules[0]
const firstChapter = firstModule.chapters[0]

export const useLearningStore = create((set, get) => ({
  modules,
  currentModule: firstModule,
  currentChapterIndex: 0,
  activeSimulationParams: firstChapter.simulation_preset,
  highlightedComponent: firstChapter.focus_component,
  selectedAnswer: null,
  answerStatus: null,

  setChapter: (chapterIndex) => {
    const { currentModule } = get()
    const targetChapter = currentModule.chapters[chapterIndex]

    if (!targetChapter) return

    set({
      currentChapterIndex: chapterIndex,
      activeSimulationParams: targetChapter.simulation_preset,
      highlightedComponent: targetChapter.focus_component,
      selectedAnswer: null,
      answerStatus: null
    })
  },

  nextChapter: () => {
    const { currentModule, currentChapterIndex, setChapter } = get()
    const nextIndex = currentChapterIndex + 1

    if (nextIndex < currentModule.chapters.length) {
      setChapter(nextIndex)
    }
  },

  prevChapter: () => {
    const { currentChapterIndex, setChapter } = get()
    const prevIndex = currentChapterIndex - 1

    if (prevIndex >= 0) {
      setChapter(prevIndex)
    }
  },

  answerCheckpoint: (answerIndex) => {
    const { currentModule, currentChapterIndex } = get()
    const chapter = currentModule.chapters[currentChapterIndex]
    const isCorrect = chapter?.checkpoint?.correct === answerIndex

    set({
      selectedAnswer: answerIndex,
      answerStatus: isCorrect ? 'correct' : 'incorrect'
    })
  },

  resetProgress: () => {
    set({
      currentModule: firstModule,
      currentChapterIndex: 0,
      activeSimulationParams: firstChapter.simulation_preset,
      highlightedComponent: firstChapter.focus_component,
      selectedAnswer: null,
      answerStatus: null
    })
  }
}))
