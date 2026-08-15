import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { getToken } from './utils/authStorage';

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      const token = await getToken();

      setHasToken(!!token);
      setIsChecking(false);
    };

    checkLogin();
  }, []);

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasToken) {
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/(auth)/welcome"/>;
}