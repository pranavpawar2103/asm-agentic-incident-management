"use client";

import { useSyncExternalStore } from "react";

// shortcut: demo-only role switch kept in localStorage, no sign-in or server checks; replace with real sessions.
export type ViewRole = "admin" | "lead" | "engineer";

export const ROLES: { value: ViewRole; label: string; person: string; home: string }[] = [
  { value: "admin", label: "Admin", person: "Alan Lands", home: "/" },
  { value: "lead", label: "Lead", person: "Priya Raman", home: "/team" },
  { value: "engineer", label: "Engineer", person: "Ravi Shankar", home: "/my-tickets" },
];

const KEY = "ams.viewAs";
const EVENT = "ams-view-as";

function read(): ViewRole {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "admin" || v === "lead" || v === "engineer") return v;
  } catch {
    // storage blocked: fall back to admin
  }
  return "admin";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setViewAs(role: ViewRole) {
  try {
    localStorage.setItem(KEY, role);
  } catch {
    // storage blocked: the switch lasts until reload
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useViewAs(): ViewRole {
  return useSyncExternalStore(subscribe, read, () => "admin");
}
