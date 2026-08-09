import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_HISTORY_KEY = '@easyeco_chat_history_v1';
const MAX_SAVED_CHATS = 20;
let saveQueue = Promise.resolve();

const readChats = async () => {
  try {
    const rawChats = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
    const chats = rawChats ? JSON.parse(rawChats) : [];
    return Array.isArray(chats) ? chats : [];
  } catch (error) {
    console.warn('Unable to read chat history:', error);
    return [];
  }
};

export const getChatHistory = readChats;

export const getChatById = async (chatId) => {
  const chats = await readChats();
  return chats.find((chat) => chat.id === chatId) || null;
};

export const deleteChat = (chatId) => {
  saveQueue = saveQueue
    .catch(() => undefined)
    .then(async () => {
      const chats = await readChats();
      await AsyncStorage.setItem(
        CHAT_HISTORY_KEY,
        JSON.stringify(chats.filter((chat) => chat.id !== chatId))
      );
    })
    .catch((error) => {
      console.warn('Unable to delete chat history:', error);
      throw error;
    });

  return saveQueue;
};

const persistChat = async ({ id, messages }) => {
  // ImagePicker's temporary URI alone is not reliable after the app restarts.
  // Keep the base64 payload as well so a chat opened from history can display
  // the attachment and send it back to the assistant as conversation context.
  const textMessages = messages.map(({ id: messageId, role, text, images = [], canRetry = false }) => ({
    id: messageId,
    role,
    text,
    canRetry,
    images: Array.isArray(images)
      ? images
        .filter((image) => image?.uri || image?.base64)
        .map(({ uri, base64, mimeType }) => ({ uri, base64, mimeType }))
      : [],
  }));
  const firstUserMessage = textMessages.find((message) => message.role === 'user');

  if (!id || !firstUserMessage?.text) return;

  const chat = {
    id,
    title: firstUserMessage.text,
    messages: textMessages,
    updatedAt: new Date().toISOString(),
  };
  const existingChats = await readChats();
  const nextChats = [
    chat,
    ...existingChats.filter((existingChat) => existingChat.id !== id),
  ].slice(0, MAX_SAVED_CHATS);

  try {
    await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(nextChats));
  } catch (error) {
    console.warn('Unable to save chat history:', error);
  }
};

// Keep writes in order so a slower first save cannot overwrite a later reply.
export const saveChat = (chat) => {
  saveQueue = saveQueue.catch(() => undefined).then(() => persistChat(chat));
  return saveQueue;
};
