import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export function configureGoogleSignIn(): void {
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
  } catch (err) {
    console.warn("Failed to configure Google Sign-In:", err);
  }
}

export async function signInWithGoogleNative(): Promise<string> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (isSuccessResponse(response)) {
    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error("Google Sign-In returned no ID Token.");
    }
    return idToken;
  }
  throw new Error("Google Sign-In was cancelled or failed.");
}
