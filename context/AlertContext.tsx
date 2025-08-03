"use client"

import { SimpleAlert } from "@/components/simple-alert"
import { createContext, useCallback, useContext, useState } from "react"

type AlertData = {
  type: "success" | "error" | "warning" | "info"
  title?: string
  message: string
  timeout?: number
}

type AlertContextType = {
  showAlert: (alert: AlertData) => void
  clearAlert: () => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [alert, setAlert] = useState<AlertData | null>(null)

  const showAlert = useCallback((alert: AlertData) => {
    setAlert(alert)
  }, [])

  const clearAlert = useCallback(() => {
    setAlert(null)
  }, [])

  return (
    <AlertContext.Provider value={{ showAlert, clearAlert }}>
      {alert && (
        <SimpleAlert
          {...alert}
          onClose={clearAlert}
        />
      )}
      {children}
    </AlertContext.Provider>
  )
}

export const useAlert = () => {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error("useAlert must be used inside AlertProvider")
  return ctx
}
