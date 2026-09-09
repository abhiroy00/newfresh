import { Alert, Platform, AlertButton } from 'react-native';

/**
 * Cross-platform alert. React Native's Alert.alert is a silent no-op on web
 * (react-native-web doesn't implement it), so dialogs never appear there.
 * On web this falls back to window.alert / window.confirm.
 */
export function appAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  // Two+ buttons: confirm maps OK -> first non-cancel button, Cancel -> cancel button
  const confirmBtn = buttons.find((b) => b.style !== 'cancel') || buttons[0];
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  if (window.confirm(text)) {
    confirmBtn.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
