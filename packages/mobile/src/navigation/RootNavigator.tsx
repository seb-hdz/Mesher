import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";
import { screenBackgroundForScheme } from "@/lib/theme";
import { MainTabNavigator } from "./MainTabNavigator";
import { PairScreen } from "../screens/PairScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ComposeScreen } from "../screens/ComposeScreen";
import { mesherNavigationLinking } from "./linking";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const scheme = useColorScheme();
  const contentBackground = screenBackgroundForScheme(scheme);

  return (
    <NavigationContainer linking={mesherNavigationLinking}>
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: contentBackground },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabNavigator}
          options={{ title: "Mesher", headerShown: false }}
        />
        <Stack.Screen
          name="Pair"
          component={PairScreen}
          options={{ title: "Pair", headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ title: "Chat", headerShown: false }}
        />
        <Stack.Screen
          name="Compose"
          component={ComposeScreen}
          options={{ title: "Compose", headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
