package com.dcc.studentmanagement;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class PushNotificationHelper {

    public static final String CHANNEL_ID_NOTICES = "dcc_channel_notices";
    public static final String CHANNEL_NAME_NOTICES = "Admin Notices & Messages";

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID_NOTICES,
                    CHANNEL_NAME_NOTICES,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("High priority push notifications for Admin Notices and Chat Messages");
            channel.enableLights(true);
            channel.setLightColor(Color.MAGENTA);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 100, 250});

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    public static void showNotification(Context context, String title, String message, String type) {
        createNotificationChannel(context);

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("type", type);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                (int) System.currentTimeMillis(),
                intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        String displayTitle = title != null && !title.isEmpty() ? title : "📢 DCC Institute Alert";
        String displayMsg = message != null && !message.isEmpty() ? message : "New update from administrator";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID_NOTICES)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(displayTitle)
                .setContentText(displayMsg)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(displayMsg))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            int notifId = (int) (System.currentTimeMillis() % 100000);
            notificationManager.notify(notifId, builder.build());
        } catch (SecurityException se) {
            // Permission not granted on Android 13+
        }
    }
}
