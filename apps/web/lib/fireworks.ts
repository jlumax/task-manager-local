let triggerFn: (() => void) | null = null;

export function registerFireworksTrigger(fn: (() => void) | null) {
  triggerFn = fn;
}

export function triggerFireworks() {
  triggerFn?.();
}
