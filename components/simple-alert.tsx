"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

type SimpleAlertProps = {
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  className?: string;
  onClose?: () => void;
  timeout?: number; // in seconds
};

export function SimpleAlert({
  type,
  title,
  message,
  className,
  onClose,
  timeout,
}: SimpleAlertProps) {
  useEffect(() => {
    if (timeout && onClose) {
      const timer = setTimeout(onClose, timeout * 1000);
      return () => clearTimeout(timer);
    }
  }, [timeout, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (): React.ComponentProps<typeof Alert>["variant"] => {
    switch (type) {
      case "success":
        return "success";
      case "error":
        return "destructive";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <Alert variant={getVariant()} className={`${className} relative`}>
      {getIcon()}
      <div className="flex-1">
        {title && <AlertTitle>{title}</AlertTitle>}
        <AlertDescription>{message}</AlertDescription>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </Alert>
  );
}
