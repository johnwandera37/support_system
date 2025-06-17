"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"

type SimpleAlertProps = {
  type: "success" | "error" | "warning" | "info"
  title?: string
  message: string
  className?: string
}

export function SimpleAlert({ type, title, message, className }: SimpleAlertProps) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4" />
      case "error":
        return <AlertCircle className="h-4 w-4" />
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "info":
        return <Info className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getVariant = () => {
    switch (type) {
      case "success":
        return "success"
      case "error":
        return "destructive"
      case "warning":
        return "warning"
      case "info":
        return "info"
      default:
        return "default"
    }
  }

  return (
    <Alert variant={getVariant() as any} className={className}>
      {getIcon()}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
