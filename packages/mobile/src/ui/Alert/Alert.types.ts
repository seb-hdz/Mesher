import { JSX } from "react";
import { LucideIcon } from "lucide-react-native";

export type AlertType = "info" | "loading" | "error";

export interface AlertProps {
  type: AlertType;
  icon?: LucideIcon;
  content: string | JSX.Element;
  details?: string;
  hideOnPaths?: string[];
}

export interface AlertModalProps extends Omit<AlertProps, "hideOnPaths"> {
  dismiss: () => void;
}
