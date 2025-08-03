
// The following can be used on local scope but for now itst not used anywhere
import { useState, useCallback } from "react";

export type AlertType = "success" | "error" | "warning" | "info";

export interface AlertState {
  type: AlertType;
  message: string;
}

export function useLocalAlert(initialState: AlertState | null = null) {
  const [alert, setAlertState] = useState<AlertState | null>(initialState);

  const setAlert = useCallback((type: AlertType, message: string) => {
    setAlertState({ type, message });
  }, []);

  const clearAlert = useCallback(() => {
    setAlertState(null);
  }, []);

  return { alert, setAlert, clearAlert };
}
