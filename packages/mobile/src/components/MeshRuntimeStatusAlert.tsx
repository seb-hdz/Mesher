import { BluetoothOff, Loader } from "lucide-react-native";
import { useL } from "../../languages/language.store";
import { useMeshStore } from "../state/meshStore";
import Alert from "./home/Alert";

/** Global runtime status: blocking errors (modal) > initializing banner > hidden. */
export function MeshRuntimeStatusAlert() {
  const l = useL();
  const ready = useMeshStore((s) => s.ready);
  const displayName = useMeshStore((s) => s.displayName);
  const bluetoothUnavailable = useMeshStore((s) => s.bluetoothUnavailable);

  const isInitializing = !ready && displayName !== "" && !bluetoothUnavailable;
  const isBluetoothUnavailable = bluetoothUnavailable && ready;

  const renderAlert = () => {
    if (isBluetoothUnavailable) {
      return (
        <Alert
          type="error"
          icon={BluetoothOff}
          content={l("NO_BLUETOOTH.TITLE")}
          details={l("NO_BLUETOOTH.SUBTITLE")}
        />
      );
    }

    if (isInitializing) {
      return (
        <Alert
          key="initializing"
          type="loading"
          icon={Loader}
          content={l("HOME.INITIALIZING")}
        />
      );
    }
    return null;
  };

  return renderAlert();
}
