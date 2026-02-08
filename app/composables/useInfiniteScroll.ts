import { ref, onMounted, onUnmounted, type Ref } from 'vue'

interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
}

export function useInfiniteScroll(
  containerRef: Ref<HTMLElement | null>,
  callback: () => Promise<void> | void,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 200, rootMargin = '200px' } = options
  const isLoading = ref(false)
  const hasMore = ref(true)
  let observer: IntersectionObserver | null = null
  let sentinelElement: HTMLDivElement | null = null

  const loadMore = async () => {
    if (isLoading.value || !hasMore.value) return
    
    isLoading.value = true
    try {
      await callback()
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    if (!containerRef.value) return

    // Create sentinel element
    sentinelElement = document.createElement('div')
    sentinelElement.style.height = '10px'
    sentinelElement.style.width = '100%'
    sentinelElement.style.visibility = 'hidden'
    containerRef.value.appendChild(sentinelElement)

    // Create intersection observer
    observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting) {
          loadMore()
        }
      },
      {
        root: containerRef.value,
        rootMargin,
        threshold: 0.1
      }
    )

    if (sentinelElement) {
      observer.observe(sentinelElement)
    }
  })

  onUnmounted(() => {
    if (observer && sentinelElement) {
      observer.unobserve(sentinelElement)
      observer.disconnect()
    }
    if (sentinelElement && sentinelElement.parentNode) {
      sentinelElement.parentNode.removeChild(sentinelElement)
    }
    observer = null
    sentinelElement = null
  })

  const updateHasMore = (value: boolean) => {
    hasMore.value = value
  }

  return {
    isLoading,
    hasMore,
    loadMore,
    updateHasMore
  }
}
