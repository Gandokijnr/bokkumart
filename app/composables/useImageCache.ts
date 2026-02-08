import { ref, onMounted, onUnmounted } from 'vue'

interface CacheEntry {
  url: string
  blob: Blob
  timestamp: number
  size: number
}

const CACHE_NAME = 'homeaffairs-image-cache-v1'
const MAX_CACHE_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_CACHE_ENTRIES = 300

/**
 * Advanced image caching composable with IndexedDB and memory cache
 */
export function useImageCache() {
  const db = ref<IDBDatabase | null>(null)
  const memoryCache = ref<Map<string, string>>(new Map())
  const isReady = ref(false)

  // Initialize IndexedDB
  const initDB = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        db.value = request.result
        isReady.value = true
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result
        if (!database.objectStoreNames.contains('images')) {
          const store = database.createObjectStore('images', { keyPath: 'url' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  // Get cached image URL (blob URL or cached data URL)
  const getCachedImage = async (url: string): Promise<string | null> => {
    // Check memory cache first
    if (memoryCache.value.has(url)) {
      return memoryCache.value.get(url)!
    }

    if (!db.value) return null

    try {
      const transaction = db.value.transaction(['images'], 'readonly')
      const store = transaction.objectStore('images')
      const request = store.get(url)

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const entry: CacheEntry | undefined = request.result
          if (entry) {
            const blobUrl = URL.createObjectURL(entry.blob)
            memoryCache.value.set(url, blobUrl)
            resolve(blobUrl)
          } else {
            resolve(null)
          }
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error reading from cache:', error)
      return null
    }
  }

  // Cache an image
  const cacheImage = async (url: string, blob: Blob): Promise<void> => {
    if (!db.value) return

    try {
      // Check cache size and cleanup if needed
      await cleanupIfNeeded()

      const entry: CacheEntry = {
        url,
        blob,
        timestamp: Date.now(),
        size: blob.size,
      }

      const transaction = db.value.transaction(['images'], 'readwrite')
      const store = transaction.objectStore('images')
      await new Promise<void>((resolve, reject) => {
        const request = store.put(entry)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      // Add to memory cache
      const blobUrl = URL.createObjectURL(blob)
      memoryCache.value.set(url, blobUrl)
    } catch (error) {
      console.error('Error caching image:', error)
    }
  }

  // Fetch and cache image
  const fetchAndCache = async (url: string): Promise<string> => {
    // Check cache first
    const cached = await getCachedImage(url)
    if (cached) return cached

    // Fetch from network
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)

    const blob = await response.blob()
    await cacheImage(url, blob)

    // Return blob URL from memory cache
    return memoryCache.value.get(url) || url
  }

  // Cleanup old entries if cache is too large
  const cleanupIfNeeded = async (): Promise<void> => {
    if (!db.value) return

    const transaction = db.value.transaction(['images'], 'readonly')
    const store = transaction.objectStore('images')
    const countRequest = store.count()

    const count = await new Promise<number>((resolve) => {
      countRequest.onsuccess = () => resolve(countRequest.result)
    })

    if (count > MAX_CACHE_ENTRIES) {
      // Remove oldest 20% of entries
      const toRemove = Math.floor(count * 0.2)

      const readTransaction = db.value.transaction(['images'], 'readonly')
      const readStore = readTransaction.objectStore('images')
      const index = readStore.index('timestamp')
      const cursorRequest = index.openCursor()

      const urlsToRemove: string[] = []

      await new Promise<void>((resolve) => {
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result
          if (cursor && urlsToRemove.length < toRemove) {
            urlsToRemove.push(cursor.value.url)
            cursor.continue()
          } else {
            resolve()
          }
        }
      })

      // Delete old entries
      const writeTransaction = db.value.transaction(['images'], 'readwrite')
      const writeStore = writeTransaction.objectStore('images')

      for (const url of urlsToRemove) {
        // Revoke blob URL if in memory
        if (memoryCache.value.has(url)) {
          URL.revokeObjectURL(memoryCache.value.get(url)!)
          memoryCache.value.delete(url)
        }
        await new Promise<void>((resolve) => {
          const deleteRequest = writeStore.delete(url)
          deleteRequest.onsuccess = () => resolve()
        })
      }
    }
  }

  // Preload images into cache
  const preloadImages = async (urls: string[]): Promise<void> => {
    await Promise.all(
      urls.map(async (url) => {
        try {
          const cached = await getCachedImage(url)
          if (!cached) {
            await fetchAndCache(url)
          }
        } catch (error) {
          console.warn('Failed to preload image:', url, error)
        }
      })
    )
  }

  // Clear all cached images
  const clearCache = async (): Promise<void> => {
    // Revoke all memory cache URLs
    memoryCache.value.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl)
    })
    memoryCache.value.clear()

    if (db.value) {
      const transaction = db.value.transaction(['images'], 'readwrite')
      const store = transaction.objectStore('images')
      await new Promise<void>((resolve) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
      })
    }
  }

  // Get cache statistics
  const getCacheStats = async (): Promise<{
    entries: number
    totalSize: number
    memoryEntries: number
  }> => {
    if (!db.value) {
      return { entries: 0, totalSize: 0, memoryEntries: memoryCache.value.size }
    }

    const transaction = db.value.transaction(['images'], 'readonly')
    const store = transaction.objectStore('images')
    const cursorRequest = store.openCursor()

    let count = 0
    let totalSize = 0

    await new Promise<void>((resolve) => {
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (cursor) {
          count++
          totalSize += cursor.value.size || 0
          cursor.continue()
        } else {
          resolve()
        }
      }
    })

    return {
      entries: count,
      totalSize,
      memoryEntries: memoryCache.value.size,
    }
  }

  // Initialize on mount
  onMounted(() => {
    initDB().catch(console.error)
  })

  // Cleanup on unmount
  onUnmounted(() => {
    // Don't clear memory cache on unmount - it might be reused
    // Just close the DB connection
    if (db.value) {
      db.value.close()
      db.value = null
    }
  })

  return {
    isReady,
    getCachedImage,
    cacheImage,
    fetchAndCache,
    preloadImages,
    clearCache,
    getCacheStats,
  }
}
