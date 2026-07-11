import { AlertType } from "@/src/ui/Alert/Alert.types";
import { useIconColors } from "@/src/ui/iconColors";

type IconColors = ReturnType<typeof useIconColors>;

export function getIconColor(type: AlertType, iconColor: IconColors) {
  switch (type) {
    case "info":
    case "loading":
      return iconColor.foreground;
    case "error":
      return iconColor.destructive;
  }
}

export function getTextColorClass(type: AlertType) {
  switch (type) {
    case "info":
    case "loading":
      return "text-foreground";
    case "error":
      return "text-destructive";
  }
}
