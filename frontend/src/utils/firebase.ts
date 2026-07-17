import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  projectId: "amparai-ce7f4",
  appId: "1:750186946997:web:5f5a07176dc9201ed6b9fc",
  storageBucket: "amparai-ce7f4.firebasestorage.app",
  apiKey: "AIzaSyCH7ZPCnTCoRie0FYuQnyreIr301oDi4DY",
  authDomain: "amparai-ce7f4.firebaseapp.com",
  messagingSenderId: "750186946997",
};

const app = initializeApp(firebaseConfig);

const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });

export { app, auth };
