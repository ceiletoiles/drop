import { registerPlugin } from '@capacitor/core';

export interface NativeGoogleAuthSignInResult {
  idToken: string;
  email?: string;
}

export interface NativeGoogleAuthSignInOptions {
  serverClientId: string;
  nonce?: string;
}

export interface NativeGoogleAuthPlugin {
  signIn(options: NativeGoogleAuthSignInOptions): Promise<NativeGoogleAuthSignInResult>;
}

export const NativeGoogleAuth = registerPlugin<NativeGoogleAuthPlugin>('NativeGoogleAuth');
