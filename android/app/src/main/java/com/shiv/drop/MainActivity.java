package com.shiv.drop;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        initialPlugins.add(AndroidDownloadPlugin.class);
        initialPlugins.add(NativeGoogleAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
