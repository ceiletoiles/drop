package com.shiv.drop;

import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "AndroidDownload")
public class AndroidDownloadPlugin extends Plugin {

    @PluginMethod
    public void saveBase64(PluginCall call) {
        String base64 = call.getString("base64");
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType");
        String kind = call.getString("kind");

        if (base64 == null || base64.isEmpty()) {
            call.reject("Missing file data.");
            return;
        }

        if (fileName == null || fileName.isEmpty()) {
            call.reject("Missing file name.");
            return;
        }

        if (mimeType == null || mimeType.isEmpty()) {
            mimeType = "application/octet-stream";
        }

        if (kind == null || kind.isEmpty()) {
            kind = mimeType.startsWith("image/") ? "image" : "file";
        }

        try {
            byte[] data = Base64.decode(base64, Base64.DEFAULT);
            Uri uri = saveDeviceFile(data, fileName, mimeType, kind);
            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Download failed.", error);
        }
    }

    private Uri saveDeviceFile(byte[] data, String fileName, String mimeType, String kind) throws IOException {
        boolean isImage = "image".equals(kind) || mimeType.startsWith("image/");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Uri collection = isImage
                ? MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                : MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            String relativePath = isImage
                ? Environment.DIRECTORY_PICTURES + File.separator + "Drop"
                : Environment.DIRECTORY_DOWNLOADS + File.separator + "Drop";

            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath);
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);

            Uri uri = getContext().getContentResolver().insert(collection, values);
            if (uri == null) {
                throw new IOException("Unable to create file.");
            }

            try (OutputStream outputStream = getContext().getContentResolver().openOutputStream(uri)) {
                if (outputStream == null) {
                    throw new IOException("Unable to open file for writing.");
                }
                outputStream.write(data);
                outputStream.flush();
            }

            values.clear();
            values.put(MediaStore.MediaColumns.IS_PENDING, 0);
            getContext().getContentResolver().update(uri, values, null, null);
            return uri;
        }

        File baseDirectory = isImage
            ? Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
            : Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File targetDirectory = new File(baseDirectory, "Drop");
        if (!targetDirectory.exists() && !targetDirectory.mkdirs()) {
            throw new IOException("Unable to create destination folder.");
        }

        File outputFile = new File(targetDirectory, fileName);
        try (FileOutputStream outputStream = new FileOutputStream(outputFile)) {
            outputStream.write(data);
            outputStream.flush();
        }

        MediaScannerConnection.scanFile(getContext(), new String[] { outputFile.getAbsolutePath() }, new String[] { mimeType }, null);
        return Uri.fromFile(outputFile);
    }
}
