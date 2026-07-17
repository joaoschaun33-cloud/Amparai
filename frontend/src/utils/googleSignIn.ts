export function configureGoogleSignIn(): void {
  // No-op on web
}

export async function signInWithGoogleNative(): Promise<string> {
  throw new Error("Native Google Sign-In is not supported on Web.");
}
