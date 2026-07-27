import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = '5000';
const API_PATH = '/api';
const LOCAL_NETWORK_HOST = '118.27.151.8';

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  return hostUri?.split(':')[0];
};

const getDefaultHost = () => {
  if (Platform.OS === 'android' && !Constants.expoConfig?.hostUri) {
    return '10.0.2.2';
  }

  if (Platform.OS === 'ios' && !Constants.expoConfig?.hostUri) {
    return 'localhost';
  }

  return LOCAL_NETWORK_HOST;
};

const API_HOST =
  process.env.EXPO_PUBLIC_API_HOST ||
  getExpoHost() ||
  getDefaultHost();

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  `http://${API_HOST}:${API_PORT}${API_PATH}`;