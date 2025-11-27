import { watch } from 'vue'

/**
 * Aguarda até que uma ref atinja um valor específico
 * @param {Ref} ref - Vue ref to watch
 * @param {Function} predicate - Function that returns true when condition is met
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise}
 */
export function waitForRef(ref, predicate, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // Se já satisfaz a condição, resolve imediatamente
    if (predicate(ref.value)) {
      resolve(ref.value)
      return
    }

    const timer = setTimeout(() => {
      stopWatch()
      reject(new Error('Timeout waiting for ref'))
    }, timeout)

    const stopWatch = watch(
      ref,
      (newValue) => {
        if (predicate(newValue)) {
          stopWatch()
          clearTimeout(timer)
          resolve(newValue)
        }
      },
      { immediate: true }
    )
  })
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
