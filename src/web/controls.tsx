import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { prefersReducedMotion, spring } from "./easing";
import { ChevronIcon } from "./icons";

/* ------------------------------------------------------------------ */
/* Segmented control with a sliding black thumb                        */
/* ------------------------------------------------------------------ */

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const el = buttons.current.get(value);
    if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value]);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const move = (dir: 1 | -1) => {
    const index = options.findIndex((o) => o.value === value);
    const next = options[(index + dir + options.length) % options.length];
    onChange(next.value);
    buttons.current.get(next.value)?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    }
  };

  return (
    <div className="seg" role="radiogroup" aria-label={label} ref={trackRef} onKeyDown={onKeyDown}>
      <span
        className="seg-thumb"
        data-ready={ready && thumb !== null}
        style={thumb ? { width: thumb.w, transform: `translateX(${thumb.x}px)` } : { width: 0 }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          ref={(el) => {
            if (el) buttons.current.set(option.value, el);
            else buttons.current.delete(option.value);
          }}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dropdown (custom listbox; never a native <select>)                  */
/* ------------------------------------------------------------------ */

export interface DropdownOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
}

interface DropdownProps<T extends string> {
  label: string;
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
}

export function Dropdown<T extends string>({ label, value, options, onChange }: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[selectedIndex];

  const openMenu = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openMenu();
        else setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openMenu();
        else setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActive(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(active);
        else openMenu();
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          close(true);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div className="dd" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="dd-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span>{current?.label}</span>
        <ChevronIcon />
      </button>
      <ul id={listId} role="listbox" className="dd-menu" data-open={open} aria-label={label} hidden={!open}>
        {options.map((option, index) => (
          <li
            key={option.value}
            id={`${listId}-${index}`}
            role="option"
            className="dd-option"
            aria-selected={option.value === value}
            data-active={index === active}
            onPointerEnter={() => setActive(index)}
            onClick={() => choose(index)}
          >
            <span className="sq" data-on={option.value === value} />
            <span>{option.label}</span>
            {option.hint && <span className="hint">{option.hint}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Number that travels from its previous value instead of replaying    */
/* ------------------------------------------------------------------ */

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
}

export function AnimatedNumber({ value, format }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const raf = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = shown.current;
    const to = value;
    cancelAnimationFrame(raf.current);

    if (from === to || prefersReducedMotion()) {
      shown.current = to;
      el.textContent = format(to);
      return;
    }

    el.style.transition = "none";
    el.style.filter = "blur(2.5px)";
    void el.offsetWidth;
    el.style.transition = "filter 300ms var(--liquid)";
    el.style.filter = "none";

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 420);
      shown.current = from + (to - from) * spring(p);
      el.textContent = format(shown.current);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else {
        shown.current = to;
        el.textContent = format(to);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, format]);

  return <span ref={ref} className="num" />;
}

/* ------------------------------------------------------------------ */
/* Pixel bar: an amount, counted                                       */
/* ------------------------------------------------------------------ */

export function MicroBar({ ratio }: { ratio: number }) {
  const amount = Math.max(0, Math.min(1, ratio));
  return <span className="mb" aria-hidden="true"><i style={{ transform: `scaleX(${amount})` }} /></span>;
}
