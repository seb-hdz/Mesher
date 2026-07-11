import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { type BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { BlurView } from "expo-blur";
import { MessageSquare, Radar, Settings, Users } from "lucide-react-native";
import { Platform, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { screenBackgroundForScheme } from "@/lib/theme";
import { useL } from "../../languages/language.store";
import ConfigPanel from "../components/config/ConfigPanel";
import { Contacts } from "../components/contacts/Contacts";
import { HomeScreen } from "../screens/HomeScreen";
import { MessageScreen } from "../screens/MessageScreen";
import { ScreenContainer } from "../ui/ScreenContainer";
import { useIconColors } from "../ui/iconColors";
import type { MainTabParamList } from "./types";
import { withTabEntrance } from "./TabScreenEntrance";
import {
  FLOATING_TAB_BAR_ABOVE_HOME,
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_SIDE,
  useFloatingTabBarBottomInset,
} from "./floatingTabBarInset";

const Tab = createBottomTabNavigator<MainTabParamList>();

function PillTabBarButton({ style, ...rest }: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...rest}
      style={[style, styles.tabBarPill]}
      android_ripple={{ borderless: false }}
    />
  );
}

function TabBarBlurBackground() {
  const scheme = useColorScheme();
  const tint =
    scheme === "dark"
      ? "systemChromeMaterialDark"
      : "systemChromeMaterialLight";

  return (
    <BlurView
      intensity={8}
      tint={tint}
      style={StyleSheet.absoluteFill}
      experimentalBlurMethod={
        Platform.OS === "android" ? "dimezisBlurView" : undefined
      }
    />
  );
}

function SettingsTabScreen() {
  const bottomPad = useFloatingTabBarBottomInset();

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        <ConfigPanel />
      </ScrollView>
    </ScreenContainer>
  );
}

const NearbyTab = withTabEntrance(HomeScreen);
const MessagesTab = withTabEntrance(MessageScreen);
const ContactsTab = withTabEntrance(Contacts);
const SettingsTab = withTabEntrance(SettingsTabScreen);

export function MainTabNavigator() {
  const l = useL();
  const icon = useIconColors();

  const activeColor = icon.foreground;
  const inactiveColor = icon.muted;
  const scheme = useColorScheme();
  const tabBarBorderColor =
    scheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const activeTabPillColor =
    scheme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.07)";
  const sceneBackground = screenBackgroundForScheme(scheme);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: sceneBackground },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarActiveBackgroundColor: activeTabPillColor,
        tabBarInactiveBackgroundColor: "transparent",
        tabBarButton: PillTabBarButton,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingTop: 0,
          paddingHorizontal: 8,
        },
        tabBarStyle: {
          position: "absolute",
          // bottom: tabBarBottom,
          bottom: FLOATING_TAB_BAR_ABOVE_HOME + 12,
          marginLeft: FLOATING_TAB_BAR_SIDE,
          marginRight: FLOATING_TAB_BAR_SIDE,
          // bottom: tabBarBottom,
          height: FLOATING_TAB_BAR_HEIGHT,
          borderRadius: FLOATING_TAB_BAR_HEIGHT / 2,
          overflow: "hidden",
          backgroundColor: "transparent",
          /** BottomTabBar adds safe-area padding + horizontal padding; that shrinks the inner area and clips labels. */
          paddingBottom: 0,
          paddingTop: 0,
          paddingHorizontal: 0,
          marginBottom: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tabBarBorderColor,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
        },
        tabBarBackground: TabBarBlurBackground,
      }}
    >
      <Tab.Screen
        name="Nearby"
        component={NearbyTab}
        options={{
          tabBarLabel: l("MAIN_TABS.NEARBY"),
          tabBarIcon: ({ color, size }) => <Radar color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesTab}
        options={{
          tabBarLabel: l("MAIN_TABS.MESSAGES"),
          tabBarIcon: ({ color, size }) => (
            <MessageSquare color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsTab}
        options={{
          tabBarLabel: l("MAIN_TABS.CONTACTS"),
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsTab}
        options={{
          tabBarLabel: l("MAIN_TABS.SETTINGS"),
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarPill: {
    flex: 1,
    borderRadius: 9999,
    overflow: "hidden",
    marginHorizontal: 2,
    marginVertical: 5,
    borderCurve: "continuous",
  },
});
