import { Stack } from "expo-router";
import { DriveSessionProvider } from "../hooks/useDriveSession";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <DriveSessionProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="drive" />
        <Stack.Screen name="summary" />
      </Stack>
    </DriveSessionProvider>
  );
}
