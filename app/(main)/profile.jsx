import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { useUsage } from '../Usage/UsageContext';
import { clearSession, getUser, saveSession } from '../utils/authStorage';
import { useLanguage } from '../context/LanguageContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Profile() {
  const router = useRouter();
  const { clearAllUsage } = useUsage();
  const { language, changeLanguage, t } = useLanguage();
  const [userName, setUserName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [helpCenterVisible, setHelpCenterVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);

  const [editName, setEditName] = useState(userName);
  const [editNumber, setEditNumber] = useState('');
  const [editGmail, setEditGmail] = useState('');
  const [editProfileImage, setEditProfileImage] = useState(profileImage);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await getUser();
        if (!user) return;

        // Display the signed-in user's saved details immediately. If the
        // profile refresh below fails (for example, while the server is being
        // deployed), the profile must not fall back to the generic "User".
        setUserName(user.name || '');
        setEditNumber(user.phoneNumber || '');
        setEditGmail(user.email || '');
        setProfileImage(user.profileImage || null);
        setEditProfileImage(user.profileImage || null);

        if (!user.token) return;

        const response = await axios.get(`${API_BASE_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const currentUser = { ...user, ...response.data };

        await saveSession(currentUser);
        setUserName(currentUser.name || '');
        setEditNumber(currentUser.phoneNumber || '');
        setEditGmail(currentUser.email || '');
        setProfileImage(currentUser.profileImage || null);
        setEditProfileImage(currentUser.profileImage || null);
      } catch (error) {
        console.warn('Unable to load profile:', error);
      }
    };

    loadProfile();
  }, []);

  const openSupportEmail = async () => {
    const emailUrl = 'mailto:easyeco637@gmail.com';
    const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=easyeco637@gmail.com';

    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
        return;
      }

      await Linking.openURL(gmailUrl);
    } catch (error) {
      Alert.alert('Unable to open email', 'Please try again later.');
    }
  };

//help center
  const HelpCenterContent = () => (
    <ScrollView contentContainerStyle={styles.helpScrollContent} showsVerticalScrollIndicator={true}>
      <View style={styles.helpCard}>
        <Text style={styles.helpSectionTitle}>How to Track Energy Usage</Text>
        <Text style={styles.helpSubTitle}>How to add your daily energy usage?</Text>
        <Text style={styles.helpBullet}>{'\u2022'} Select your device from the list.</Text>
        <Image source={require('../../assets/track-duration-wattage.jpg')} style={styles.helpImage} resizeMode="contain" />
        <Text style={styles.helpBullet}>{'\u2022'} Choose the wattage (appliance type/ model).</Text>
        <Text style={styles.helpBullet}>{'\u2022'} Enter the duration (usage hours).</Text>
        <Text style={styles.helpBullet}>{'\u2022'} Tap the "+" button to log it.</Text>
        <Image source={require('../../assets/addusagedetail.jpg')} style={styles.helpImage} resizeMode="contain" />
        <Text style={styles.helpBullet}>{'\u2022'} Press the "Calculate Bill" button to save your total usage and instantly calculate your daily cost.</Text>
        <View style={styles.calculateButtonContainer}>
          <View style={styles.calculateButton}>
            <Text style={styles.calculateButtonText}>Calculate Bill</Text>
          </View>
        </View>
      </View>

      <View style={styles.helpCard}>
        <Text style={styles.helpSubTitle}>How to find your appliance wattage?</Text>
        <Text style={styles.helpBullet}><Text style={styles.helpBold}>{'\u2022'} Check the Product Label:</Text> Look for a silver or white sticker/plate on the back or bottom of your appliance.</Text>
        <Text style={styles.helpBullet}><Text style={styles.helpBold}>{'\u2022'} Locate the "W" or "Watt" Value:</Text> Look for a number followed by a W (e.g., 1000W or 60W).</Text>
        <Text style={styles.helpBullet}><Text style={styles.helpBold}>{'\u2022'} Check the User Manual or Box:</Text> If the label is scratched off, you can find the power specification in the manual or on the original packaging.</Text>
      </View>

      <View style={styles.helpCard}>
        <Text style={styles.helpSubTitle}>Understanding your dashboard graphs</Text>
        <Text style={styles.helpParagraph}>EasyEco turns your scanned monthly bills into simple, easy-to-read visual charts. Here is how to understand the data on your dashboard:</Text>
        <Text style={styles.helpBullet}><Text style={styles.helpBold}>• How its updates:</Text> Every time you scan a new electricity bill, the AI automatically extracts your total units (kWh) and adds a new bar for that month.</Text>
        <Text style={styles.helpBullet}><Text style={styles.helpBold}>• How to read it:</Text>{'\n'}Higher bars: Mean you used more electricity that month.{'\n'}Lower bars: Mean your energy-saving efforts worked!</Text>
      </View>

      <View style={styles.helpCard}>
        <Text style={styles.helpSubTitle}>Using the AI Smart Bill Analyst</Text>
        <Text style={styles.helpSubSubTitle}>How to Scan Your Electricity Bill</Text>
        <Text style={styles.helpNumbered}>1. Open the AI Assistant.</Text>
        <Text style={styles.helpNumbered}>2. Tap the Upload Image button.</Text>
        <Text style={styles.helpNumbered}>3. Take or select a clear photo of your electricity bill.</Text>
        <Text style={styles.helpNumbered}>4. Wait for AI to analyze your bill.</Text>
        <Text style={styles.helpNumbered}>5. View your usage details and energy-saving suggestions.</Text>
        <Text style={styles.helpSubSubTitle}>Photo Tips for Best AI Analysis</Text>
        <Text style={styles.helpBullet}>• Take a clear and well-lit photo.</Text>
        <Text style={styles.helpBullet}>• Make sure all text on the bill is visible.</Text>
        <Text style={styles.helpBullet}>• Keep the bill flat and avoid shadows.</Text>
        <Text style={styles.helpBullet}>• Capture the entire bill in the frame.</Text>
        <Text style={styles.helpBullet}>• Avoid blurry or tilted images.</Text>
        <Text style={styles.helpSubSubTitle}>What Data Does the AI Extract?</Text>
        <Text style={styles.helpBullet}>• Meter reading</Text>
        <Text style={styles.helpBullet}>• Previous and current usage</Text>
        <Text style={styles.helpBullet}>• Electricity units (kWh)</Text>
        <Text style={styles.helpBullet}>• Billing amount</Text>
        <Text style={styles.helpBullet}>• Billing period</Text>
        <Text style={styles.helpBullet}>• Usage trends</Text>
        <Text style={styles.helpBullet}>• Energy-saving recommendations</Text>
      </View>

      <View style={styles.helpCard}>
        <Text style={styles.helpSubTitle}>Contact us</Text>
        <Text style={styles.helpParagraph}>Need help? We're here to assist you.</Text>
        <View style={styles.helpEmailRow}>
          <Text style={styles.helpParagraph}>Email: </Text>
          <TouchableOpacity onPress={openSupportEmail} activeOpacity={0.7}>
            <Text style={[styles.helpParagraph, styles.helpEmail]}>easyeco637@gmail.com</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const handleEditProfile = () => {
    setEditName(userName);
    setEditProfileImage(profileImage);
    setEditModalVisible(true);
  };

  const saveProfile = async () => {
    const name = editName.trim();
    const phoneNumber = editNumber.trim();

    if (!name) {
      Alert.alert('Missing information', 'Please enter your name.');
      return;
    }

    try {
      setIsSavingProfile(true);
      const user = await getUser();
      const hasNewLocalProfileImage =
        editProfileImage?.startsWith('file:') ||
        editProfileImage?.startsWith('content:') ||
        editProfileImage?.startsWith('blob:');
      const imageDataUrl = hasNewLocalProfileImage
        ? await imageUriToDataUrl(editProfileImage)
        : undefined;
      const response = await axios.put(
        `${API_BASE_URL}/users/profile`,
        {
          name,
          ...(phoneNumber ? { phoneNumber } : {}),
          email: editGmail.trim(),
          ...(imageDataUrl ? { profileImage: imageDataUrl } : {}),
        },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      const updatedUser = { ...user, ...response.data };

      await saveSession(updatedUser);
      setUserName(updatedUser.name);
      setEditNumber(updatedUser.phoneNumber || '');
      setEditGmail(updatedUser.email || '');
      setProfileImage(updatedUser.profileImage || null);
      setEditProfileImage(updatedUser.profileImage || null);
      setEditModalVisible(false);
    } catch (error) {
      if (error.response?.status === 401) {
        await clearSession();
        setEditModalVisible(false);
        Alert.alert(
          'Please log in again',
          'Your previous session is no longer valid. Sign in again to save your profile.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
        return;
      }

      Alert.alert('Unable to save profile', error.response?.data?.message || 'Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const cancelEdit = () => {
    setEditModalVisible(false);
  };

  const toggleLanguageDropdown = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsLanguageOpen(!isLanguageOpen);
  };

  const selectLanguage = async (lang) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await changeLanguage(lang);
    setIsLanguageOpen(false);
  };

  const goToHelpCenter = () => setHelpCenterVisible(true);
  const goToAbout = () => setAboutModalVisible(true);
  const goToChangePassword = () => setChangePasswordModalVisible(true);

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    try {
      setIsSavingPassword(true);
      const user = await getUser();
      await axios.put(
        `${API_BASE_URL}/users/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordModalVisible(false);
      Alert.alert('Success', 'Password changed successfully');
    } catch (error) {
      if (error.response?.status === 401 && error.response?.data?.message?.includes('session')) {
        await clearSession();
        setChangePasswordModalVisible(false);
        Alert.alert('Please log in again', error.response.data.message, [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
        return;
      }

      Alert.alert('Unable to change password', error.response?.data?.message || 'Please try again.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirmation'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('logout'), onPress: async () => {
          setIsLoggingOut(true);
          try {
            clearAllUsage();
            await clearSession();
            router.replace('/(auth)/login');
          } catch (error) {
            Alert.alert('Error', t('logoutFailed'));
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const imageUriToDataUrl = async (uri) => {
    if (!uri?.startsWith('file:') && !uri?.startsWith('content:') && !uri?.startsWith('blob:')) {
      return null;
    }

    const imageResponse = await fetch(uri);
    const imageBlob = await imageResponse.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to read the selected image.'));
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(imageBlob);
    });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to change your photo.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const pickImageForModal = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to change your photo.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditProfileImage(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            <View style={styles.avatarContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#ccc" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{userName || 'User'}</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account')}</Text>
          <View style={styles.box}>
            <TouchableOpacity style={styles.boxRow} onPress={handleEditProfile}>
              <View style={styles.rowLeft}>
                <Image source={require('../../assets/Edi.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <Text style={styles.boxRowText}>{t('editProfile')}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.boxRow} onPress={goToChangePassword}>
              <View style={styles.rowLeft}>
                <Image source={require('../../assets/pass.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <Text style={styles.boxRowText}>{t('changePassword')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preference Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('preference')}</Text>
          <View style={styles.box}>
            <TouchableOpacity style={styles.boxRow} onPress={toggleLanguageDropdown}>
              <View style={styles.rowLeft}>
                <Image source={require('../../assets/Lang.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <Text style={styles.boxRowText}>{t('language')}</Text>
              </View>
            </TouchableOpacity>
            {isLanguageOpen && (
              <View style={styles.dropdownContainer}>
                <TouchableOpacity style={styles.dropdownOption} onPress={() => selectLanguage('en')}>
                  <Text style={styles.dropdownText}>{t('english')}</Text>
                  {language === 'en' && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.dropdownOption} onPress={() => selectLanguage('my')}>
                  <Text style={styles.dropdownText}>{t('myanmar')}</Text>
                  {language === 'my' && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('support')}</Text>
          <View style={styles.box}>
            <TouchableOpacity style={styles.boxRow} onPress={goToHelpCenter}>
              <View style={styles.rowLeft}>
                <Image source={require('../../assets/Help.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <Text style={styles.boxRowText}>{t('helpCenter')}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.boxRow} onPress={goToAbout}>
              <View style={styles.rowLeft}>
                <Image source={require('../../assets/Info.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                <Text style={styles.boxRowText}>{t('about')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <View style={styles.box}>
            <TouchableOpacity style={styles.boxRow} onPress={handleLogout}>
              <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={22} color="#1A1A1A" />
                <Text style={styles.logoutText}>{t('logout')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal animationType="slide" transparent={false} visible={editModalVisible} onRequestClose={cancelEdit}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.headerPillButton} onPress={cancelEdit}>
              <Text style={styles.headerPillText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerPillButton} onPress={saveProfile} disabled={isSavingProfile}>
              <Text style={styles.headerPillText}>{isSavingProfile ? t('saving') : t('done')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.editPhotoContainer}>
              <TouchableOpacity onPress={pickImageForModal} activeOpacity={0.8}>
                <View style={styles.editAvatarContainer}>
                  {editProfileImage ? (
                    <Image source={{ uri: editProfileImage }} style={styles.editAvatarImage} />
                  ) : (
                    <View style={styles.editAvatarPlaceholder}>
                      <Ionicons name="person" size={40} color="#ccc" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImageForModal}>
                <Text style={styles.changePhotoText}>{t('changePhoto')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('updateName')}</Text>
              <TextInput style={styles.inputField} value={editName} onChangeText={setEditName} placeholder={t('enterName')} placeholderTextColor="#999" />
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#1A1A1A" style={styles.infoIcon} />
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoLabel}>{t('number')}</Text>
                  <TextInput style={styles.infoInput} value={editNumber} onChangeText={setEditNumber} placeholder={t('enterPhone')} placeholderTextColor="#999" keyboardType="phone-pad" />
                </View>
              </View>
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#1A1A1A" style={styles.infoIcon} />
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoLabel}>{t('gmail')}</Text>
                  <TextInput style={styles.infoInput} value={editGmail} onChangeText={setEditGmail} placeholder={t('enterEmail')} placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" />
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Help Center Modal */}
      <Modal animationType="slide" transparent={false} visible={helpCenterVisible} onRequestClose={() => setHelpCenterVisible(false)}>
        <SafeAreaView style={styles.helpCenterContainer}>
          
            <TouchableOpacity onPress={() => setHelpCenterVisible(false)} style={styles.helpCenterBackButton}>
              <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
            </TouchableOpacity>
            
          <HelpCenterContent />
        </SafeAreaView>
      </Modal>

      {/* About Modal */}
      <Modal animationType="slide" transparent={false} visible={aboutModalVisible} onRequestClose={() => setAboutModalVisible(false)}>
        <SafeAreaView style={styles.aboutModalContainer}>
          <View style={styles.aboutModalHeader}>
            <TouchableOpacity onPress={() => setAboutModalVisible(false)} style={styles.aboutBackButton}>
              <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.aboutScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/Logoact2.png')} style={styles.logoImage} resizeMode="contain" />
              <Text style={styles.appName}>EasyEco</Text>
            </View>
            <Text style={styles.versionText}>Version 1.0.0</Text>
            <Text style={styles.description}>EasyEco is an AI-powered electricity management app that helps users estimate electricity bills, monitor energy usage, analyze electricity bills with AI, and receive personalized energy-saving recommendations. The app also provides usage history, monthly comparison graphs, and smart notifications to support better electricity management.</Text>
            <Text style={styles.featuresTitle}>Key Features</Text>
            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>• Bill Calculator</Text>
              <Text style={styles.featureItem}>• Monthly Bill Estimation</Text>
              <Text style={styles.featureItem}>• Usage History & Graphs</Text>
              <Text style={styles.featureItem}>• AI Bill Analysis</Text>
              <Text style={styles.featureItem}>• AI Chatbot</Text>
              <Text style={styles.featureItem}>• Energy-Saving Tips</Text>
              <Text style={styles.featureItem}>• Notifications</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Change Password Modal */}
      <Modal animationType="slide" transparent={false} visible={changePasswordModalVisible} onRequestClose={() => setChangePasswordModalVisible(false)}>
        <SafeAreaView style={styles.changePasswordContainer}>
          <View style={styles.changePasswordHeader}>
            <TouchableOpacity onPress={() => setChangePasswordModalVisible(false)} style={styles.changePasswordBackButton}>
              <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.changePasswordScrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.changePasswordTitle}>{t('changePassword')}</Text>
            <View style={styles.passwordInputSection}>
              <Text style={styles.passwordInputLabel}>{t('currentPassword')}</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput style={[styles.passwordInputField, styles.passwordInputWithEye]} value={currentPassword} onChangeText={setCurrentPassword} placeholder={t('enterCurrentPassword')} placeholderTextColor="#999" secureTextEntry={!isCurrentPasswordVisible} />
                <TouchableOpacity style={styles.passwordEyeButton} onPress={() => setIsCurrentPasswordVisible((visible) => !visible)} accessibilityRole="button" accessibilityLabel={isCurrentPasswordVisible ? 'Hide password' : 'Show password'}>
                  <Ionicons name={isCurrentPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={22} color="#555" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.passwordInputSection}>
              <Text style={styles.passwordInputLabel}>{t('newPassword')}</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput style={[styles.passwordInputField, styles.passwordInputWithEye]} value={newPassword} onChangeText={setNewPassword} placeholder={t('enterNewPassword')} placeholderTextColor="#999" secureTextEntry={!isNewPasswordVisible} />
                <TouchableOpacity style={styles.passwordEyeButton} onPress={() => setIsNewPasswordVisible((visible) => !visible)} accessibilityRole="button" accessibilityLabel={isNewPasswordVisible ? 'Hide password' : 'Show password'}>
                  <Ionicons name={isNewPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={22} color="#555" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.passwordInputSection}>
              <Text style={styles.passwordInputLabel}>{t('confirmNewPassword')}</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput style={[styles.passwordInputField, styles.passwordInputWithEye]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t('confirmPassword')} placeholderTextColor="#999" secureTextEntry={!isConfirmPasswordVisible} />
                <TouchableOpacity style={styles.passwordEyeButton} onPress={() => setIsConfirmPasswordVisible((visible) => !visible)} accessibilityRole="button" accessibilityLabel={isConfirmPasswordVisible ? 'Hide password' : 'Show password'}>
                  <Ionicons name={isConfirmPasswordVisible ? 'eye-outline' : 'eye-off-outline'} size={22} color="#555" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={[styles.saveButton, isSavingPassword && styles.saveButtonDisabled]} onPress={handleSavePassword} activeOpacity={0.8} disabled={isSavingPassword}>
              <Text style={styles.saveButtonText}>{isSavingPassword ? 'Saving...' : t('save')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff',flexGrow: 1  },
  container: { paddingHorizontal: 36, paddingVertical: 36,paddingBottom: 100  },
  header: { alignItems: 'center', marginBottom: 28 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, marginBottom: 14, overflow: 'hidden' },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#e8e8ed' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#e8e8ed' },
  userName: { fontSize: 22, fontWeight: '700', color: '#1a1a2e' },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#007AFF', marginBottom: 12, letterSpacing: 0.3 },
  box: { backgroundColor: '#F0F0F0', borderRadius: 6, overflow: 'hidden' },
  boxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  boxRowText: { fontSize: 16, fontWeight: '500', color: '#1A1A1A' },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginHorizontal: 18 },
  dropdownContainer: { paddingHorizontal: 8, paddingBottom: 8 },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginHorizontal: 4 },
  dropdownOptionSelected: { backgroundColor: '#C8D9F0' },
  dropdownText: { fontSize: 16, color: '#1A1A1A', fontWeight: '400' },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#ff3b30' },

  // Help Center
  helpCenterContainer: { flex: 1, backgroundColor: '#ffffff' },
  helpCenterHeader: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  helpCenterBackButton: { width: 48, height: 48, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
  helpCenterHeaderTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '600', color: '#1a1a1a', marginRight: 40 },
  helpScrollContent: { paddingHorizontal: 48, paddingTop: 68, paddingBottom: 40 },
  helpCard: { backgroundColor: '#fff', marginBottom: 50 },
  helpSectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  helpSubTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 12 },
  helpSubSubTitle: { fontSize: 14, fontWeight: '600', color: '#444', marginTop: 16, marginBottom: 10 },
  helpBullet: { fontSize: 14, lineHeight: 24, color: '#444', marginBottom: 4 },
  helpNumbered: { fontSize: 14, lineHeight: 24, color: '#444', marginBottom: 4, paddingLeft: 4 },
  helpParagraph: { fontSize: 14, lineHeight: 24, color: '#444', marginBottom: 12 },
  helpBold: { fontWeight: '600' },
  helpImage: { width: '78%', height: 355, alignSelf: 'center', marginTop: 18, marginBottom: 24 },
  calculateButtonContainer: { alignItems: 'center', marginTop: 10, marginBottom: 8 },
  calculateButton: { backgroundColor: '#2864e8', paddingHorizontal: 44, paddingVertical: 16, borderRadius: 34 },
  calculateButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  helpEmail: { color: '#2563EB' },
  helpEmailRow: { flexDirection: 'row', alignItems: 'center' },

  // Edit Profile
  modalContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginBottom: 20 },
  headerPillButton: { backgroundColor: '#E8E8E8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  headerPillText: { fontSize: 15, color: '#1A1A1A', fontWeight: '600' },
  editPhotoContainer: { alignItems: 'center', marginBottom: 24 },
  editAvatarContainer: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, overflow: 'hidden' },
  editAvatarImage: { width: 100, height: 100, borderRadius: 50 },
  editAvatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center' },
  changePhotoText: { fontSize: 14, color: '#007AFF', fontWeight: '500', marginTop: 4 },
  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '400', color: '#333', marginBottom: 10, paddingHorizontal: 4 },
  inputField: { borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#1A1A1A', backgroundColor: '#F0F0F0' },
  infoContainer: { backgroundColor: '#F0F0F0', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { marginRight: 14, marginTop: 2 },
  infoTextWrapper: { flex: 1 },
  infoLabel: { fontSize: 15, fontWeight: '400', color: '#1A1A1A', marginBottom: 4 },
  infoInput: { fontSize: 16, color: '#1A1A1A', paddingVertical: 0, paddingHorizontal: 0, fontWeight: '400' },

  // About
  aboutModalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  aboutModalHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  aboutBackButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  aboutScrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginTop: 8, marginBottom: 12 },
  logoImage: { width: 80, height: 80, marginBottom: 12 },
  appName: { fontSize: 20, fontWeight: '500', color: '#2E7DFF' },
  versionText: { fontSize: 16, color: '#1A1A1A', marginBottom: 20, textAlign: 'left' },
  description: { fontSize: 15, color: '#1A1A1A', lineHeight: 24, marginBottom: 28 },
  featuresTitle: { fontSize: 16, fontWeight: '500', color: '#1A1A1A', marginBottom: 12 },
  featuresList: { gap: 8 },
  featureItem: { fontSize: 15, color: '#1A1A1A', lineHeight: 22 },

  // Change Password
  changePasswordContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  changePasswordHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  changePasswordBackButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  changePasswordScrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  changePasswordTitle: { fontSize: 22, fontWeight: '600', color: '#1A5FCC', textAlign: 'center', marginBottom: 48 },
  passwordInputSection: { marginBottom: 20 },
  passwordInputLabel: { fontSize: 15, fontWeight: '400', color: '#1A1A1A', marginBottom: 10 },
  passwordInputField: { backgroundColor: '#F0F0F0', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, fontSize: 15, color: '#1A1A1A' },
  passwordInputWrapper: { position: 'relative' },
  passwordInputWithEye: { paddingRight: 58 },
  passwordEyeButton: { position: 'absolute', right: 14, top: 0, height: '100%', width: 32, justifyContent: 'center', alignItems: 'center' },
  saveButton: { backgroundColor: '#1A5FCC', borderRadius: 26, paddingVertical: 16, alignItems: 'center', marginTop: 32, marginHorizontal: 20 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
