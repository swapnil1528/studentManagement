package com.dcc.studentmanagement;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.TimeUnit;

public class BackgroundMessageWorker extends Worker {

    private static final String PREF_NAME = "dcc_worker_prefs";
    private static final String KEY_LAST_NOTICE = "last_seen_notice";

    public BackgroundMessageWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        try {
            // Periodic background check against Vercel web endpoint / Google Apps Script
            OkHttpClient client = new OkHttpClient.Builder()
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .readTimeout(15, TimeUnit.SECONDS)
                    .build();

            // Lightweight ping check
            Request request = new Request.Builder()
                    .url("https://student-management-one-wine.vercel.app/manifest.json")
                    .build();

            Response response = client.newCall(request).execute();
            if (response.isSuccessful()) {
                // Background worker is alive and synced
            }
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }
}
