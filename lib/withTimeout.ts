/** Rejette si la promesse ne se termine pas dans le délai donné : évite un chargement infini. */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message = 'Délai dépassé'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
