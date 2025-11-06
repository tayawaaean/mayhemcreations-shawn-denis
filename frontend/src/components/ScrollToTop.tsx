import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Custom smooth scroll function that provides a slower, more emphasized scroll animation.
 * This creates a more noticeable transition when navigating to hash sections.
 * 
 * @param targetY - The target Y position to scroll to
 * @param duration - Duration of the scroll animation in milliseconds (default: 1000ms for slow scroll)
 */
function smoothScrollTo(targetY: number, duration: number = 1000): void {
  const startY = window.scrollY
  const distance = targetY - startY
  let startTime: number | null = null

  function animation(currentTime: number) {
    if (startTime === null) startTime = currentTime
    const timeElapsed = currentTime - startTime
    const progress = Math.min(timeElapsed / duration, 1) // Clamp to 0-1

    // Easing function: ease-in-out cubic for smooth acceleration and deceleration
    const ease = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2

    window.scrollTo(0, startY + distance * ease)

    if (timeElapsed < duration) {
      requestAnimationFrame(animation)
    }
  }

  requestAnimationFrame(animation)
}

/**
 * ScrollToTop component that scrolls the window to the top whenever the route changes.
 * This ensures that when users navigate to a new page, they start at the top of the page
 * instead of maintaining their scroll position from the previous page.
 * 
 * For hash links (like /faq#section), it provides a slow, smooth scroll to emphasize
 * the navigation change and make it clear to users that the page has changed.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // Only scroll to top if there's no hash in the URL
    // Hash links (like /faq#section) should navigate to their target element
    if (!hash) {
      // Using 'instant' behavior for immediate scroll, which is better UX for navigation
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    // If there is a hash, use our custom slow scroll function to emphasize the change
    else {
      // Wait a bit longer to ensure the page content is fully rendered
      const timer = setTimeout(() => {
        const element = document.querySelector(hash)
        if (element) {
          // Get the element's position and add a small offset (80px) so it's not right at the top edge
          // This accounts for any fixed headers and provides better visual spacing
          const elementPosition = element.getBoundingClientRect().top + window.scrollY
          const offset = 80 // Offset in pixels from the top
          const targetPosition = elementPosition - offset

          // Use our custom smooth scroll function with a slower duration (1200ms)
          // This creates a more emphasized, noticeable scroll animation
          smoothScrollTo(targetPosition, 1200)
        }
      }, 150) // Slightly longer delay to ensure content is rendered
      return () => clearTimeout(timer)
    }
  }, [pathname, hash])

  return null
}

