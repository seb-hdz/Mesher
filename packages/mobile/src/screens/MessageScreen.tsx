import { ConversationList } from "../components/messages/ConversationList";
import { ScreenContainer } from "../ui/ScreenContainer";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function MessageScreen() {
  const { top } = useSafeAreaInsets();

  return (
    <ScreenContainer className="pb-0" style={{ paddingTop: top }}>
      <ConversationList />
    </ScreenContainer>
  );
}
