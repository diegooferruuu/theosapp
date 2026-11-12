"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/types";

const SessionContext = createContext<User | null>(null);

export const SessionProvider = SessionContext.Provider;

export function useSession(): User {
  const user = useContext(SessionContext);
  if (!user) throw new Error("useSession fuera de la sesión");
  return user;
}
