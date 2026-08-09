import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = '5000';
const API_PATH = '/api';
const CLOUD_SERVER_HOST = '118.27.151.8';

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  return hostUri?.split(':')[0];
};

const getDefaultHost = () => {
  // If in development mode AND no Expo host is found, use local emulators
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return '10.0.2.2';
    }
    if (Platform.OS === 'ios') {
      return 'localhost';
    }
  }

  return CLOUD_SERVER_HOST;
};

const API_HOST =
  process.env.EXPO_PUBLIC_API_HOST || 
  CLOUD_SERVER_HOST; 

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  `http://${API_HOST}:${API_PORT}${API_PATH}`;