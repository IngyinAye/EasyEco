import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { SafeAreaProvider , SafeAreaView } from "react-native-safe-area-context";

export default function AuthLayout() {
  return (
    <SafeAreaProvider>     
      <StatusBar style="light-content" backgroundColor="#ffffff" />
      <Stack screenOptions={{ headerShown: false }} >
  <Stack.Screen name="welcome" />
  <Stack.Screen name="login" />
  <Stack.Screen name="signup" />
  </Stack>
  </SafeAreaProvider>
  );
}