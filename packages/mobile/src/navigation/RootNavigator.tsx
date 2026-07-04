import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainTabNavigator } from "./MainTabNavigator";
import { PairScreen } from "../screens/PairScreen";
import { ComposeScreen } from "../screens/ComposeScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
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
          name="Compose"
          component={ComposeScreen}
          options={{ title: "Compose", headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
