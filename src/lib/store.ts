"use client";

import { useSyncExternalStore } from "react";
import type { StationId } from "./layout";
import type { Phase } from "./sim";

/**
 * Tiny external store for the discrete UI state (phase, panel visibility,
 * hover, sound). Components subscribe with primitive selectors only.
 */

export interface UIState {
  phase: Phase;
  /** Station whose crate is out on the line (or heading there). */
  activeStation: StationId | null;
  /** Station panel is visible (camera parked at the station). */
  panelOpen: boolean;
  /** A choreographed sequence is running – navigation inputs are locked. */
  busy: boolean;
  hovered: StationId | null;
  sound: boolean;
  /** Scene has mounted and rendered its first frame. */
  ready: boolean;
  /** Short operator-facing status line for the HUD. */
  status: string;
}

type Listener = () => void;

let state: UIState = {
  phase: "IDLE",
  activeStation: null,
  panelOpen: false,
  busy: false,
  hovered: null,
  sound: false,
  ready: false,
  status: "Ready",
};

const listeners = new Set<Listener>();

export const ui = {
  get: () => state,
  set(partial: Partial<UIState>) {
    let changed = false;
    for (const key in partial) {
      const k = key as keyof UIState;
      if (state[k] !== partial[k]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useUI<T extends string | number | boolean | null>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(
    ui.subscribe,
    () => selector(ui.get()),
    () => selector(ui.get()),
  );
}
