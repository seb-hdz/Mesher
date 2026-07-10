import type { NavigatorScreenParams } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type MainTabParamList = {
  Nearby: undefined;
  Messages: undefined;
  Contacts: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Pair: undefined;
  Compose: { peerId?: string; body?: string } | undefined;
  Chat: { peerId: string };
};

export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Nearby">,
  NativeStackScreenProps<RootStackParamList, "Main">
>;

export type ContactsTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Contacts">,
  NativeStackScreenProps<RootStackParamList, "Main">
>;

export type MessagesTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Messages">,
  NativeStackScreenProps<RootStackParamList, "Main">
>;
