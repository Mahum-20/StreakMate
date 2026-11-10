const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidWidget = (config) => {
  // 1. Modify AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    const receiverName = '.StreakWidgetProvider';
    const exists = mainApplication.receiver.some(
      (r) => r.$ && r.$['android:name'] === receiverName
    );

    if (!exists) {
      mainApplication.receiver.push({
        $: {
          'android:name': receiverName,
          'android:label': 'StreakMate Habits Widget',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/streak_widget_info',
            },
          },
        ],
      });
    }

    return config;
  });

  // 2. Copy/Create native files
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;

      const xmlDir = path.join(projectRoot, 'app', 'src', 'main', 'res', 'xml');
      const layoutDir = path.join(projectRoot, 'app', 'src', 'main', 'res', 'layout');
      const drawableDir = path.join(projectRoot, 'app', 'src', 'main', 'res', 'drawable');
      const javaDir = path.join(projectRoot, 'app', 'src', 'main', 'java', 'com', 'streakmate', 'app');

      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(layoutDir, { recursive: true });
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.mkdirSync(javaDir, { recursive: true });

      // 1. streak_widget_info.xml
      const widgetInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="90dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/streak_widget_layout"
    android:previewImage="@drawable/splashscreen_logo"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>
`;
      fs.writeFileSync(path.join(xmlDir, 'streak_widget_info.xml'), widgetInfoXml);

      // 2. streak_widget_bg.xml (Cute squircle card)
      const widgetBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#131F24" />
    <stroke android:width="2dp" android:color="#2C3E48" />
    <corners android:radius="20dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_bg.xml'), widgetBgXml);

      // 3. streak_widget_checkbox_bg.xml (Duolingo Chunky 3D Green Button)
      const checkboxBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#58CC02" />
    <corners android:radius="12dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_checkbox_bg.xml'), checkboxBgXml);

      // 4. streak_widget_bubble_bg.xml (Cute speech bubble)
      const bubbleBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#202F36" />
    <stroke android:width="1dp" android:color="#334155" />
    <corners android:radius="10dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_bubble_bg.xml'), bubbleBgXml);

      // 5. streak_widget_flame_badge.xml
      const flameBadgeXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#362415" />
    <stroke android:width="1dp" android:color="#523218" />
    <corners android:radius="8dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_flame_badge.xml'), flameBadgeXml);

      // 6. streak_widget_layout.xml (Duolingo Style with 1 or 2 Streaks + Checkboxes)
      const widgetLayoutXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/streak_widget_bg"
    android:padding="12dp">

    <!-- Header: Mascot Flame & Cute Speech Bubble -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginBottom="8dp">

        <ImageView
            android:id="@+id/widget_mascot"
            android:layout_width="28dp"
            android:layout_height="28dp"
            android:src="@drawable/splashscreen_logo"
            android:layout_marginEnd="8dp" />

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:background="@drawable/streak_widget_bubble_bg"
            android:paddingHorizontal="10dp"
            android:paddingVertical="4dp">

            <TextView
                android:id="@+id/widget_speech"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Tap checkbox to save streak! 🔥"
                android:textColor="#FDE047"
                android:textSize="11sp"
                android:textStyle="bold"
                android:singleLine="true" />
        </LinearLayout>
    </LinearLayout>

    <!-- Streak 1 Row -->
    <LinearLayout
        android:id="@+id/streak_1_row"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:paddingVertical="4dp">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/streak_widget_flame_badge"
            android:text="🔥"
            android:textSize="13sp"
            android:paddingHorizontal="6dp"
            android:paddingVertical="2dp"
            android:layout_marginEnd="8dp" />

        <TextView
            android:id="@+id/streak_1_name"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Primary Habit"
            android:textColor="#FFFFFF"
            android:textSize="14sp"
            android:textStyle="bold"
            android:singleLine="true" />

        <TextView
            android:id="@+id/streak_1_checkbox"
            android:layout_width="38dp"
            android:layout_height="36dp"
            android:background="@drawable/streak_widget_checkbox_bg"
            android:text="✓"
            android:textColor="#FFFFFF"
            android:textSize="16sp"
            android:textStyle="bold"
            android:gravity="center"
            android:layout_marginStart="8dp" />
    </LinearLayout>

    <!-- Divider Line -->
    <View
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:background="#2C3E48"
        android:layout_marginVertical="3dp" />

    <!-- Streak 2 Row -->
    <LinearLayout
        android:id="@+id/streak_2_row"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:paddingVertical="4dp">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/streak_widget_flame_badge"
            android:text="🔥"
            android:textSize="13sp"
            android:paddingHorizontal="6dp"
            android:paddingVertical="2dp"
            android:layout_marginEnd="8dp" />

        <TextView
            android:id="@+id/streak_2_name"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Secondary Habit"
            android:textColor="#FFFFFF"
            android:textSize="14sp"
            android:textStyle="bold"
            android:singleLine="true" />

        <TextView
            android:id="@+id/streak_2_checkbox"
            android:layout_width="38dp"
            android:layout_height="36dp"
            android:background="@drawable/streak_widget_checkbox_bg"
            android:text="✓"
            android:textColor="#FFFFFF"
            android:textSize="16sp"
            android:textStyle="bold"
            android:gravity="center"
            android:layout_marginStart="8dp" />
    </LinearLayout>
</LinearLayout>
`;
      fs.writeFileSync(path.join(layoutDir, 'streak_widget_layout.xml'), widgetLayoutXml);

      // 7. StreakWidgetProvider.kt (Attaches independent check-in intents to both checkboxes)
      const providerKt = `package com.streakmate.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class StreakWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.streak_widget_layout)

            // Open widget manager on widget card tap
            val openAppIntent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://checkin/quick")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val openAppPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, openAppPendingIntent)

            // Checkbox 1 intent
            val checkIn1Intent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://checkin/quick_1")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val checkIn1Pending = PendingIntent.getActivity(
                context,
                101,
                checkIn1Intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.streak_1_checkbox, checkIn1Pending)

            // Checkbox 2 intent
            val checkIn2Intent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://checkin/quick_2")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val checkIn2Pending = PendingIntent.getActivity(
                context,
                102,
                checkIn2Intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.streak_2_checkbox, checkIn2Pending)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
`;
      fs.writeFileSync(path.join(javaDir, 'StreakWidgetProvider.kt'), providerKt);

      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidWidget;
