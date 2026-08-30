package com.shiv.drop;

import android.app.Activity;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.CustomCredential;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    private static final String TAG = "NativeGoogleAuth";

    @PluginMethod
    public void signIn(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android activity is not available.");
            return;
        }

        String serverClientId = call.getString("serverClientId");
        if (serverClientId == null || serverClientId.trim().isEmpty()) {
            call.reject("Missing Google web client ID.");
            return;
        }
        serverClientId = serverClientId.trim();

        String nonce = call.getString("nonce");
        if (nonce != null) {
            nonce = nonce.trim();
        }

        try {
            CredentialManager credentialManager = CredentialManager.create(activity);
            Executor executor = ContextCompat.getMainExecutor(activity);
            launchGoogleSignIn(credentialManager, activity, executor, call, serverClientId, nonce);
        } catch (Exception error) {
            Log.e(TAG, "Unable to start native Google sign-in.", error);
            call.reject("Unable to start Google sign-in.", error);
        }
    }

    private void launchGoogleSignIn(
        CredentialManager credentialManager,
        Activity activity,
        Executor executor,
        PluginCall call,
        String serverClientId,
        String nonce
    ) {
        GetCredentialRequest request = buildGoogleRequest(serverClientId, nonce);

        credentialManager.getCredentialAsync(activity, request, null, executor, new CredentialManagerCallback<>() {
            @Override
            public void onResult(@NonNull GetCredentialResponse result) {
                try {
                    if (!(result.getCredential() instanceof CustomCredential)) {
                        call.reject("Unexpected credential type returned by Google sign-in.");
                        return;
                    }

                    CustomCredential credential = (CustomCredential) result.getCredential();
                    if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                        call.reject("Unexpected Google credential type returned by Credential Manager.");
                        return;
                    }

                    GoogleIdTokenCredential googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.getData());
                    String idToken = googleIdTokenCredential.getIdToken();
                    if (idToken == null || idToken.isEmpty()) {
                        call.reject("Google sign-in did not return an ID token.");
                        return;
                    }

                    JSObject payload = new JSObject();
                    payload.put("idToken", idToken);
                    call.resolve(payload);
                } catch (Exception error) {
                    Log.e(TAG, "Unexpected Google sign-in failure.", error);
                    call.reject("Google sign-in failed.", error);
                }
            }

            @Override
            public void onError(@NonNull GetCredentialException error) {
                if (error instanceof GetCredentialCancellationException) {
                    call.reject("Google sign-in was cancelled.", error);
                    return;
                }

                Log.e(TAG, "Credential Manager sign-in failed.", error);
                String message = error.getMessage();
                call.reject(message == null || message.isEmpty() ? "Google sign-in failed." : message, error);
            }
        });
    }

    private GetCredentialRequest buildGoogleRequest(String serverClientId, String nonce) {
        GetSignInWithGoogleOption.Builder optionBuilder = new GetSignInWithGoogleOption.Builder(serverClientId);

        if (nonce != null && !nonce.isEmpty()) {
            optionBuilder.setNonce(nonce);
        }

        return new GetCredentialRequest.Builder()
            .addCredentialOption(optionBuilder.build())
            .build();
    }
}
