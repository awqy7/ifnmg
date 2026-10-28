"use client";

import { RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const modalStack: HTMLElement[] = [];

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((element) => {
    if (element.getAttribute("aria-hidden") === "true") return false;
    return element.offsetWidth > 0 || element.offsetHeight > 0;
  });
}

function isTopmost(container: HTMLElement) {
  return modalStack[modalStack.length - 1] === container;
}

interface UseModalA11yOptions {
  open: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function useModalA11y<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  { open, onClose, initialFocusRef }: UseModalA11yOptions
) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    modalStack.push(container);
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      if (!isTopmost(container)) return;
      const firstFocusable = getFocusable(container)[0];
      (initialFocusRef?.current ?? firstFocusable ?? container).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopmost(container)) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const outside = !active || active === container || !container.contains(active);

      if (event.shiftKey) {
        if (outside || active === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (outside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);

      const stackIndex = modalStack.lastIndexOf(container);
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1);

      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [containerRef, initialFocusRef, open]);
}
