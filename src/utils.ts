import { watch, type Ref } from 'vue'

/**
 * Aguarda até que uma ref atinja um valor específico
 * @param ref - Vue ref to watch
 * @param predicate - Function that returns true when condition is met
 * @param timeout - Timeout in milliseconds (default: 10000)
 * @returns Promise that resolves when predicate is true
 * 
 * @example
 * ```ts
 * // Aguardar loading terminar
 * await waitForRef(auth.loading, (v) => v === false)
 * 
 * // Aguardar usuário ser carregado
 * await waitForRef(auth.user, (u) => u !== null, 5000)
 * ```
 */
export function waitForRef<T>(
  ref: Ref<T>,
  predicate: (value: T) => boolean,
  timeout: number = 10000
): Promise<T> {
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
 * Sleep utility - pausa a execução por um tempo determinado
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 * 
 * @example
 * ```ts
 * // Aguardar 1 segundo
 * await sleep(1000)
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
