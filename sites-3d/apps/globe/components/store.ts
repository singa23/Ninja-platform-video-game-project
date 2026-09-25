"use client";
import { create } from "zustand";

type S = {
  selected: string | null;
  hovered: string | null;
  ready: boolean;
  select: (c: string | null) => void;
  hover: (c: string | null) => void;
  setReady: () => void;
};

export const useGlobe = create<S>((set) => ({
  selected: null,
  hovered: null,
  ready: false,
  select: (c) => set({ selected: c }),
  hover: (c) => set({ hovered: c }),
  setReady: () => set({ ready: true }),
}));
