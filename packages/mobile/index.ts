import "./src/logging/installConsoleCapture";
import { installNativeMesherLogBridge } from "./src/logging/installNativeMesherLogBridge";

import * as SplashScreen from "expo-splash-screen";
import { registerRootComponent } from "expo";

import App from "./App";

void SplashScreen.preventAutoHideAsync();

installNativeMesherLogBridge();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
