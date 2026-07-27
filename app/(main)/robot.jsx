import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  Platform, 
  Image,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Animated
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import Bot_Logo from '../../assets/bot_logo.svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { getChatById, saveChat } from '../utils/chatHistory';

const FLOATING_PADDING = 20;
const BAR_HEIGHT = 54;
// Keep the chat composer above the custom floating bottom tab bar.
const TAB_BAR_HEIGHT = 60;
const TAB_BAR_GAP = 16;
const CHAT_COMPOSER_BOTTOM = FLOATING_PADDING + TAB_BAR_HEIGHT + TAB_BAR_GAP;

const askMeterAI = async (messages) => {
  const response = await axios.post(`${API_BASE_URL}/chat`, { messages });
  return response.data.answer;
};

const toApiMessage = ({ role, text, images = [] }) => {
  const content = [];

  if (text?.trim()) content.push({ type: 'text', text: text.trim() });

  images.forEach(({ base64, mimeType }) => {
    if (base64) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${base64}` },
      });
    }
  });

  return {
    role,
    content: content.length === 1 && content[0].type === 'text' ? content[0].text : content,
  };
};

const getImageUri = ({ uri, base64, mimeType }) => (
  base64 ? `data:${mimeType || 'image/jpeg'};base64,${base64}` : uri
);

export default function ChatbotScreen() {
  const KEYBOARD_GAP = 45;
  const insets = useSafeAreaInsets(); 
  const router = useRouter();
  const { chatId, newChat } = useLocalSearchParams();
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightRef = useRef(new Animated.Value(0)).current;

  const suggestions = [
    "How can I lower my electricity bill?",
    "Tips to save energy on Air Conditioning?",
    "Which appliances consume the most power?"
  ];

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const height = event.endCoordinates?.height || 0;
        setKeyboardHeight(height);
        Animated.timing(keyboardHeightRef, {
          toValue: height,
          duration: Platform.OS === 'ios' ? event.duration || 250 : 0,
          useNativeDriver: false,
        }).start();
      }
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        Animated.timing(keyboardHeightRef, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 0,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const loadSelectedChat = async () => {
      if (newChat) {
        setMessages([]);
        setActiveChatId(null);
        setShowSuggestions(true);
        setInputText('');
        setSelectedImages([]);
        return;
      }

      if (!chatId || chatId === activeChatId) return;

      const chat = await getChatById(chatId);
      if (chat) {
        setMessages(chat.messages || []);
        setActiveChatId(chat.id);
        setShowSuggestions(false);
        setSelectedImages([]);
      }
    };

    loadSelectedChat();
  }, [chatId, newChat]);

  const handleSend = async (messageToSend = inputText) => {
    const userMessage = messageToSend.trim();
    const imagesToSend = selectedImages;
    if ((userMessage === '' && imagesToSend.length === 0) || isSending) return;

    const newUserMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: userMessage || 'Sent an image.',
      images: imagesToSend,
    };
    const conversation = [...messages, newUserMessage].map(toApiMessage);
    const nextChatId = activeChatId || `${Date.now()}`;

    setMessages((currentMessages) => [...currentMessages, newUserMessage]);
    setActiveChatId(nextChatId);
    saveChat({ id: nextChatId, messages: [...messages, newUserMessage] });
    setShowSuggestions(false);
    setInputText('');
    setSelectedImages([]);
    Keyboard.dismiss();

    try {
      setIsSending(true);
      const answer = await askMeterAI(conversation);

      const assistantMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: answer || 'Sorry, I could not get an answer right now.',
      };
      const updatedMessages = [...messages, newUserMessage, assistantMessage];
      setMessages(updatedMessages);
      saveChat({ id: nextChatId, messages: updatedMessages });
    } catch (error) {
      const errorMessage = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        text: error.response?.data?.message || 'Failed to contact the meter assistant.',
      };
      const updatedMessages = [...messages, newUserMessage, errorMessage];
      setMessages(updatedMessages);
      saveChat({ id: nextChatId, messages: updatedMessages });
    } finally {
      setIsSending(false);
    }
  };

  const takePhoto = async () => {
    setShowMenu(false);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert("You've refused to allow this app to access your camera!");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      setSelectedImages((current) => [...current, ...result.assets].slice(0, 4));
    }
  };

  const pickImage = async () => {
    setShowMenu(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("You've refused to allow this app to access your photos!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      setSelectedImages((current) => [...current, ...result.assets].slice(0, 4));
    }
  };

  const bottomOffset = insets.bottom + FLOATING_PADDING;
  const chatComposerBottom = Math.max(bottomOffset, CHAT_COMPOSER_BOTTOM);

  // ✅ CORRECT FIX: 
  // When keyboardHeight = 0 (hidden): bottom = bottomOffset (floating position)
  // When keyboardHeight = 300 (shown): bottom = 300 (sits ON TOP of keyboard)
  // We use keyboardHeightRef directly as the bottom value!
  const bottomPosition = keyboardHeightRef.interpolate({
    inputRange: [0, 1000],
    outputRange: [bottomOffset, 0],  // This was wrong! Let me fix it properly below
    extrapolate: 'clamp',
  });

  // Actually, the simplest and most correct approach:
  // Just use keyboardHeight state directly for the bottom position when keyboard is open
  // And bottomOffset when closed. No need for complex interpolation.

  const isKeyboardVisible = keyboardHeight > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/(main)')}>
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M15 19L8 12L15 5" stroke="#0D2A4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('../Usage/History')}>
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M3 12H21M3 6H21M3 18H21" stroke="#0D2A4A" strokeWidth="2.5" strokeLinecap="round"/>
          </Svg>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          // ✅ Add padding to push content above input bar when keyboard opens
          {
            paddingBottom: isKeyboardVisible
              ? keyboardHeight + BAR_HEIGHT + 20
              : chatComposerBottom + BAR_HEIGHT + 20,
          }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View>
            <View style={styles.mainContent}>
              <View style={styles.botCircle}>
                <Bot_Logo width={100} height={100} />
              </View>
              <Text style={styles.welcomeText}>
                Hi User, how can I help{"\n"}you today?
              </Text>
            </View>

            {messages.length > 0 && (
              <View style={styles.messagesContainer}>
                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                    ]}
                  >
                    {message.images?.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.messageImages}>
                        {message.images.map((image, index) => (
                          <Image
                            key={`${getImageUri(image)}-${index}`}
                            source={{ uri: getImageUri(image) }}
                            style={styles.messageImage}
                          />
                        ))}
                      </ScrollView>
                    )}
                    <Text
                      style={[
                        styles.messageText,
                        message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                      ]}
                    >
                      {message.text}
                    </Text>
                  </View>
                ))}

                {isSending && (
                  <View style={[styles.messageBubble, styles.assistantMessage]}>
                    <Text style={[styles.messageText, styles.assistantMessageText]}>Thinking...</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>

      {/* ✅ FIXED: Use keyboardHeight directly for bottom position */}
      <Animated.View style={[
        styles.bottomFixedContainer,
        { 
          bottom: isKeyboardVisible ? keyboardHeight + KEYBOARD_GAP : chatComposerBottom,
          left: FLOATING_PADDING,
          right: FLOATING_PADDING,
        }
      ]}>

        {showSuggestions && selectedImages.length === 0 && !showMenu && !isKeyboardVisible && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.suggestionItem}
                onPress={() => handleSend(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedImages.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewList}>
            {selectedImages.map((image, index) => (
              <View key={`${image.uri}-${index}`} style={styles.imagePreviewContainer}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.closeImageButton}
                  onPress={() => setSelectedImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.plusButton} onPress={() => setShowMenu(!showMenu)}>
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <Path 
                d="M12 5V19M5 12H21" 
                stroke={showMenu ? "#1A56DB" : "#666"} 
                strokeWidth="2.5" 
                strokeLinecap="round"
                opacity={showMenu ? 0.5 : 1}
              />
            </Svg>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Ask me anything..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              if (text.trim()) setShowSuggestions(false);
            }}
            onFocus={() => setShowMenu(false)}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            blurOnSubmit={true}
          />

          <TouchableOpacity 
            style={[
              styles.sendButton,
              ((inputText.trim() === '' && selectedImages.length === 0) || isSending) && styles.sendButtonDisabled
            ]} 
            onPress={() => handleSend()}
            disabled={(inputText.trim() === '' && selectedImages.length === 0) || isSending}
          >
            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <Path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </TouchableOpacity>
        </View>

        {showMenu && (
          <View style={styles.viberMenuContainer}>
            <TouchableOpacity style={styles.viberMenuItem} onPress={pickImage}>
              <View style={[styles.iconCircle, { backgroundColor: '#EBF2FF' }]}>
                <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <Path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM14.14 11.86L11.14 15.73L9 13.14L6 17H18L14.14 11.86Z" fill="#1A56DB"/>
                </Svg>
              </View>
              <Text style={styles.viberMenuText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.viberMenuItem} onPress={takePhoto}>
              <View style={[styles.iconCircle, { backgroundColor: '#EBF2FF' }]}>
                <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <Path d="M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM19.3 5H16.8L15.4 3.3C15.1 3.1 14.7 3 14.3 3H9.7C9.3 3 8.9 3.1 8.6 3.3L7.2 5H4.7C3.8 5 3 5.8 3 6.7V17.3C3 18.2 3.8 19 4.7 19H19.3C20.2 19 21 18.2 21 17.3V6.7C21 5.8 20.2 5 19.3 5Z" fill="#1A56DB"/>
                </Svg>
              </View>
              <Text style={styles.viberMenuText}>Camera</Text>
            </TouchableOpacity>
          </View>
        )}

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFF' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    height: 50 
  },
  headerButton: { 
    padding: 5 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  mainContent: { 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 20
  },
  botCircle: { 
    width: 150, 
    height: 150, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  welcomeText: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#000', 
    textAlign: 'center', 
    lineHeight: 30 
  },
  messagesContainer: {
    width: '100%',
    marginTop: 24,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#1A56DB',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F3F4',
  },
  messageText: {
    fontSize: 14,
    // Myanmar combining marks need extra vertical room so adjacent lines do
    // not overlap on Android system fonts.
    lineHeight: 28,
  },
  messageImages: {
    maxHeight: 130,
    marginBottom: 8,
  },
  messageImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginRight: 8,
  },
  userMessageText: {
    color: '#FFF',
  },
  assistantMessageText: {
    color: '#1C3D5A',
  },
  suggestionsContainer: { 
    marginBottom: 10,
    width: '100%',
  },
  suggestionItem: { 
    backgroundColor: '#E8F0FE', 
    borderRadius: 20, 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    marginBottom: 8 
  },
  suggestionText: { 
    color: '#1C3D5A', 
    fontSize: 13, 
    fontWeight: '500' 
  },
  bottomFixedContainer: {
    position: 'absolute',
    backgroundColor: '#FFF',
  },
  imagePreviewContainer: { 
    position: 'relative', 
    width: 90, 
    height: 60, 
    borderRadius: 12, 
    marginRight: 8,
    marginBottom: 8,
    overflow: 'hidden', 
    backgroundColor: '#E5E7EB' 
  },
  imagePreviewList: {
    maxHeight: 68,
    marginBottom: 8,
  },
  imagePreview: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover' 
  },
  closeImageButton: { 
    position: 'absolute', 
    top: 2, 
    right: 2, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  closeText: { 
    color: '#FFF', 
    fontSize: 12, 
    fontWeight: '700', 
    marginTop: -2 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F3F4', 
    borderRadius: 24, 
    paddingHorizontal: 12, 
    paddingVertical: 6,
    height: BAR_HEIGHT,
  },
  plusButton: { 
    padding: 6, 
    marginRight: 4 
  },
  textInput: { 
    flex: 1, 
    color: '#333', 
    fontSize: 15, 
    paddingVertical: 0,
  },
  sendButton: { 
    backgroundColor: '#1A56DB', 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 6 
  },
  sendButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  viberMenuContainer: { 
    flexDirection: 'row', 
    justifyContent: 'flex-start', 
    paddingVertical: 10,
    paddingHorizontal: 10, 
    backgroundColor: '#FFF' 
  },
  viberMenuItem: { 
    alignItems: 'center', 
    marginRight: 35 
  },
  iconCircle: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 6, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2, 
    elevation: 2 
  },
  viberMenuText: { 
    fontSize: 12, 
    color: '#4A5568', 
    fontWeight: '600' 
  }
});
