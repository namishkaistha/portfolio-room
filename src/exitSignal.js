// Lets a panel's open() return a promise that settles when the panel closes.
// Call wait() at the very start of open() so a close during an opening
// animation still settles it.
export function createExitSignal() {
  let settle = null;
  return {
    wait() {
      return new Promise((resolve) => {
        settle = resolve;
      });
    },
    fire() {
      const resolve = settle;
      settle = null;
      resolve?.();
    },
  };
}
