export const scrollToTop = (duration: number = 500): void => {
  const start: number = window.scrollY
  const startTime: number =
    'now' in window.performance ? performance.now() : new Date().getTime()

  const animateScroll = (timestamp: number): void => {
    const elapsed: number = timestamp - startTime

    window.scrollTo(0, easeInOutCubic(elapsed, start, -start, duration))

    if (elapsed < duration) {
      requestAnimationFrame(animateScroll)
    }
  }

  const easeInOutCubic = (
    t: number,
    b: number,
    c: number,
    d: number
  ): number => {
    t /= d / 2
    if (t < 1) return (c / 2) * t * t * t + b
    t -= 2
    return (c / 2) * (t * t * t + 2) + b
  }

  requestAnimationFrame(animateScroll)
}
