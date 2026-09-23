// A small deterministic runner for hooks that use refs, memoized callbacks and
// effects. Effects run after render, and changed dependencies/unmount clean up.
export function createHookRunner() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) {
        const slot = { value: typeof initial === "function" ? initial() : initial };
        slot.setValue = (next) => { slot.value = typeof next === "function" ? next(slot.value) : next; };
        slots[index] = slot;
      }
      return [slots[index].value, slots[index].setValue];
    },
    useReducer(reducer, initial) {
      const [state, setState] = react.useState(initial);
      const dispatch = react.useCallback((action) => setState((value) => reducer(value, action)), []);
      return [state, dispatch];
    },
    useRef(value) {
      const index = cursor++;
      return slots[index] ??= { current: value };
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: factory() };
      return slots[index].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const index = cursor++;
      if (same(slots[index]?.deps, deps)) return;
      effects.push(() => {
        slots[index]?.cleanup?.();
        slots[index] = { deps, cleanup: effect() };
      });
    },
  };
  return {
    react,
    render(callback) {
      cursor = 0;
      effects = [];
      const result = callback();
      effects.forEach((effect) => effect());
      return result;
    },
    unmount() { slots.forEach((slot) => slot.cleanup?.()); },
  };
}

export const settle = () => new Promise((resolve) => setImmediate(resolve));
