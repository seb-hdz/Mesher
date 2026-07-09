import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

const useKeyboard = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const isIos = Platform.OS === "ios";
    const showEvent = isIos ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = isIos ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscriber = Keyboard.addListener(showEvent, () =>
      setIsKeyboardOpen(true)
    );
    const hideSubscriber = Keyboard.addListener(hideEvent, () =>
      setIsKeyboardOpen(false)
    );

    return () => {
      showSubscriber.remove();
      hideSubscriber.remove();
    };
  }, []);

  return { keyboardOpen: isKeyboardOpen };
};

export default useKeyboard;
