
import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import axios from 'axios';
import { saveSession } from '../utils/authStorage';
import { showAuthSuccessNotification } from '../utils/authNotification';
import { useUsage } from '../Usage/UsageContext';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';

import * as WebBrowser from 'expo-web-browser';

import {
  Image,
  View,
  Text,
  StatusBar,
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import SocialButton from '../../components/SocialButton';
import {
  FACEBOOK_APP_ID,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from '../../config/auth';
import { API_BASE_URL } from '../../config/api';

WebBrowser.maybeCompleteAuthSession();

const HEADER_COLOR = '#3B3BFF';
const GOOGLE_REDIRECT_URI = 'com.anonymous.easyeco:/oauthredirect';
const FACEBOOK_REDIRECT_URI = `fb${FACEBOOK_APP_ID}://authorize`;
const AUTH_REDIRECT_OPTIONS = {
  scheme: 'com.anonymous.easyeco',
};

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { refreshUsage } = useUsage();

  const [isChecked, setIsChecked] =
    useState(false);

  const [username, setUsername] =
    useState('');

  const [phoneNumber, setPhoneNumber] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [
    googleRequest,
    googleResponse,
    googlePromptAsync,
  ] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    redirectUri: GOOGLE_REDIRECT_URI,
    scopes: ['profile', 'email'],
    selectAccount: true,
  }, AUTH_REDIRECT_OPTIONS);


  const [
    fbRequest,
    fbResponse,
    fbPromptAsync,
  ] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
    redirectUri: FACEBOOK_REDIRECT_URI,
    extraParams: {
      auth_type: 'reauthenticate',
      display: 'touch',
    },
  });

  useEffect(() => {
    if (
      googleResponse?.type === 'success'
    ) {
      const { authentication } =
        googleResponse;

      const accessToken =
        authentication?.accessToken ||
        googleResponse.params?.access_token;

      if (accessToken) {
        handleGoogleLogin(accessToken);
      }
    }

    if (
      googleResponse?.type === 'error'
    ) {
      Alert.alert(
        'Google Login Failed',
        JSON.stringify(
          googleResponse.error
        )
      );
    }
  }, [googleResponse]);

  useEffect(() => {
    if (fbResponse?.type === 'success') {
      const { authentication } =
        fbResponse;

      const accessToken =
        authentication?.accessToken ||
        fbResponse.params?.access_token;

      if (accessToken) {
        handleFacebookLogin(accessToken);
      }
    }

    if (fbResponse?.type === 'error') {
      Alert.alert(
        'Facebook Login Failed',
        JSON.stringify(
          fbResponse.error
        )
      );
    }
  }, [fbResponse]);

  const handleGoogleLogin = async (
    accessToken
  ) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/users/google-login`, {
        accessToken,
      });

      await saveSession({ ...response.data, provider: 'google' });
      await refreshUsage();

      await showAuthSuccessNotification(true);
      router.replace('/(main)');
    } catch (error) {
      Alert.alert(
        'Google Login Failed',
        error.response?.data?.message || error.message || 'Please try again.'
      );
    }
  };

  const handleFacebookLogin =
    async (accessToken) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/users/facebook-login`, {
          accessToken,
        });

        await saveSession({ ...response.data, provider: 'facebook' });
        await refreshUsage();

        await showAuthSuccessNotification(true);
        router.replace('/(main)');
      } catch (error) {
        Alert.alert('Facebook Login Failed');
      }
    };

  const handleSubmit = async () => {
    try {
      if (isSubmitting) {
        return;
      }

      if (!username.trim()) {
        return Alert.alert(
          'Error',
          'Please enter username'
        );
      }

      if (!phoneNumber.trim()) {
        return Alert.alert(
          'Error',
          'Please enter phone number'
        );
      }

      if (password.length < 6) {
        return Alert.alert(
          'Error',
          'Password must be at least 6 characters'
        );
      }

      if (
        confirmPassword !== password
      ) {
        return Alert.alert(
          'Error',
          'Passwords do not match'
        );
      }

      if (!isChecked) {
        return Alert.alert(
          'Error',
          'Please agree to Terms & Conditions'
        );
      }

      setIsSubmitting(true);

      const response = await axios.post(
        `${API_BASE_URL}/users/register`,
        {
          name: username,
          phoneNumber,
          password,
        },
        {
          timeout: 10000,
        }
      );

      await saveSession(response.data);
      await refreshUsage();
      await showAuthSuccessNotification(true);
      router.replace('/(main)');
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message ||
        error.message ||
        'Signup failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={HEADER_COLOR}
        barStyle="light-content"
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          bounces={false}
        >
          {/* HEADER */}
          <View
            style={[
              styles.blueHeaderWrapper,
              {
                paddingTop: insets.top,
                paddingBottom: 60,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.profileCircle}>

                <Image
                  source={require('../../assets/Logoact2.png')}
                  style={{
                    width: 50,
                    height: 50,
                    resizeMode: 'contain',
                  }}
                />
              </View>

              <Text style={styles.title}>
                Create Your Account
              </Text>
            </View>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            <CustomInput
              label="Username"
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
            />

            <CustomInput
              label="Phone Number"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChangeText={
                setPhoneNumber
              }
              keyboardType="phone-pad"
            />

            <CustomInput
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secure
            />

            <CustomInput
              label="Confirm Password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChangeText={
                setConfirmPassword
              }
              secure
            />

            {/* CHECKBOX */}
            <View
              style={
                styles.checkboxContainer
              }
            >
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  isChecked &&
                  styles.checkboxChecked,
                ]}
                onPress={() =>
                  setIsChecked(
                    !isChecked
                  )
                }
              >
                {isChecked && (
                  <Text
                    style={
                      styles.checkmark
                    }
                  >
                    ✓
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>
                I agree to the{' '}
                <Text
                  style={styles.linkText}
                >
                  Terms & Conditions
                </Text>
              </Text>
            </View>

            {/* SIGNUP BUTTON */}
            <View
              style={[
                styles.bottomFixed,
                {
                  paddingBottom:
                    Math.max(
                      insets.bottom,
                      15
                    ),
                },
              ]}
            >
              <View
                style={{
                  alignItems:
                    'center',
                }}
              >
                <CustomButton
                  title={
                    isSubmitting
                      ? 'Signing Up...'
                      : 'Sign Up'
                  }
                  onPress={
                    handleSubmit
                  }
                  loading={isSubmitting}
                />
              </View>

              <TouchableOpacity
                onPress={() =>
                  router.push(
                    '/(auth)/login'
                  )
                }
              >
                <Text
                  style={
                    styles.loginText
                  }
                >
                  Already have an
                  account?{' '}
                  <Text
                    style={{
                      color: 'blue',
                    }}
                  >
                    Sign in
                  </Text>
                </Text>
              </TouchableOpacity>

              <Text style={styles.or}>
                Or
              </Text>

              {/* SOCIAL LOGIN */}
              <View
                style={
                  styles.socialRow
                }
              >
                <SocialButton
                  title="Google"
                  icon={require('../../assets/google1.png')}
                  onPress={() => {
                    if (googleRequest) {
                      googlePromptAsync();
                    }
                  }}
                />

                <SocialButton
                  title="Facebook"
                  icon={require('../../assets/facebook2.png')}
                  onPress={() => {
                    if (fbRequest) {
                      fbPromptAsync();
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },

  blueHeaderWrapper: {
    backgroundColor: HEADER_COLOR,
  },

  header: {
    paddingHorizontal: 25,
  },

  profileCircle: {
  width: 80,
  height: 80,
  borderRadius: 200,
  backgroundColor: '#fff',
  marginTop: 20,
  marginBottom: 10,
  justifyContent: 'center',
  alignItems: 'center',
},


  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },

  form: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: -35,
    paddingBottom: 36,
  },

  bottomFixed: {
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },

  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 5,
    marginLeft: 25,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: HEADER_COLOR,
    borderRadius: 6,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxChecked: {
    backgroundColor: HEADER_COLOR,
  },

  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },

  label: {
    color: '#666',
  },

  linkText: {
    color: HEADER_COLOR,
    fontWeight: 'bold',
  },

  loginText: {
    textAlign: 'center',
    marginTop: 10,
  },

  or: {
    textAlign: 'center',
    marginVertical: 8,
    color: '#aaa',
  },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginTop: 2,
  },
});
