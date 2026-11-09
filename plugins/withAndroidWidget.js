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
          'android:label': 'StreakMate Quick Check-In',
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

      // Write streak_widget_info.xml
      const widgetInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="140dp"
    android:minHeight="70dp"
    android:targetCellWidth="2"
    android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/streak_widget_layout"
    android:previewImage="@drawable/splashscreen_logo"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>
`;
      fs.writeFileSync(path.join(xmlDir, 'streak_widget_info.xml'), widgetInfoXml);

      // Write streak_widget_bg.xml
      const widgetBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#0F172A" />
    <stroke android:width="1.5dp" android:color="#334155" />
    <corners android:radius="16dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_bg.xml'), widgetBgXml);

      // Write streak_widget_btn_bg.xml
      const widgetBtnBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#38BDF8" />
    <corners android:radius="10dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_btn_bg.xml'), widgetBtnBgXml);

      // Write streak_widget_layout.xml
      const widgetLayoutXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:background="@drawable/streak_widget_bg"
    android:padding="14dp"
    android:gravity="center_vertical">

    <ImageView
        android:id="@+id/widget_icon"
        android:layout_width="32dp"
        android:layout_height="32dp"
        android:src="@drawable/splashscreen_logo"
        android:layout_marginEnd="10dp" />

    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical">

        <TextView
            android:id="@+id/widget_title"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="StreakMate"
            android:textColor="#FFFFFF"
            android:textSize="15sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_subtitle"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Tap to Check In"
            android:textColor="#94A3B8"
            android:textSize="11sp"
            android:layout_marginTop="2dp" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_button"
        android:layout_width="wrap_content"
        android:layout_height="36dp"
        android:text="Check In"
        android:gravity="center"
        android:textColor="#0F172A"
        android:background="@drawable/streak_widget_btn_bg"
        android:textSize="12sp"
        android:textStyle="bold"
        android:paddingStart="12dp"
        android:paddingEnd="12dp" />
</LinearLayout>
`;
      fs.writeFileSync(path.join(layoutDir, 'streak_widget_layout.xml'), widgetLayoutXml);

      // Write StreakWidgetProvider.kt
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

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://checkin/quick")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
            views.setOnClickPendingIntent(R.id.widget_button, pendingIntent)

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
