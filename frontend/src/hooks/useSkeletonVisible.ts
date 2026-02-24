import { useEffect, useState } from 'react'

/**
 * Keeps the skeleton visible for 2 extra animation frames after `isLoading`
 * becomes false. This ensures React has committed and painted the real content
 * before the skeleton disappears, preventing the blank flash between skeleton
 * and content.
 */
export function useSkeletonVisible(isLoading: boolean): boolean {
  const [visible, setVisible] = useState(isLoading)

  useEffect(() => {
    if (isLoading) {
      setVisible(true)
      return
    }
    let raf1: number
    let raf2: number
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(false))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [isLoading])

  return visible
}
