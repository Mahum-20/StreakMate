const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidWidget = (config) => {
  // 1. Modify AndroidManifest.xml to register StreakWidgetProvider receiver with broad lifecycle intents
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
              {
                $: {
                  'android:name': 'com.streakmate.app.ACTION_WIDGET_CHECKIN',
                },
              },
              {
                $: {
                  'android:name': 'android.intent.action.BOOT_COMPLETED',
                },
              },
              {
                $: {
                  'android:name': 'android.intent.action.TIME_SET',
                },
              },
              {
                $: {
                  'android:name': 'android.intent.action.TIMEZONE_CHANGED',
                },
              },
              {
                $: {
                  'android:name': 'android.intent.action.DATE_CHANGED',
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

  // 2. Register StreakWidgetPackage in MainApplication.kt
  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('StreakWidgetPackage()')) {
      contents = contents.replace(
        'PackageList(this).packages.apply {',
        'PackageList(this).packages.apply {\n          add(StreakWidgetPackage())'
      );
    }
    config.modResults.contents = contents;
    return config;
  });

  // 3. Generate native Android files & copy mascot drawables
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

      // Copy mascot illustrations from assets/mascot to Android res/drawable
      const mascotSrcDir = path.join(config.modRequest.projectRoot, 'assets', 'mascot');
      const mascotFiles = [
        ['nimbus_morning.png', 'widget_mascot_morning.png'],
        ['nimbus_afternoon.png', 'widget_mascot_afternoon.png'],
        ['nimbus_evening.png', 'widget_mascot_evening.png'],
        ['nimbus_night.png', 'widget_mascot_night.png'],
        ['nimbus_complete.png', 'widget_mascot_complete.png'],
      ];
      for (const [srcName, destName] of mascotFiles) {
        const srcPath = path.join(mascotSrcDir, srcName);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, path.join(drawableDir, destName));
        }
      }

      // 1. streak_widget_info.xml (Standard 4x2 Android Home Screen Widget)
      const widgetInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/streak_widget_layout"
    android:previewImage="@mipmap/ic_launcher"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>
`;
      fs.writeFileSync(path.join(xmlDir, 'streak_widget_info.xml'), widgetInfoXml);

      // 2. streak_widget_bg.xml (Rich Soft Sky: #172430 surface, #2A4053 border, 22dp corners)
      const widgetBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#172430" />
    <stroke android:width="1.5dp" android:color="#2A4053" />
    <corners android:radius="22dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_bg.xml'), widgetBgXml);

      // 3. streak_widget_item_card_bg.xml (Duolingo-style elevated habit card surface)
      const itemCardBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#213342" />
    <stroke android:width="1dp" android:color="#2E465A" />
    <corners android:radius="14dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_item_card_bg.xml'), itemCardBgXml);

      // 4. streak_widget_bubble_bg.xml (Speech bubble with high contrast border)
      const bubbleBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#293E50" />
    <stroke android:width="1dp" android:color="#3A566E" />
    <corners android:radius="10dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_bubble_bg.xml'), bubbleBgXml);

      // 5. streak_widget_check_pending.xml (Accessible circular action button)
      const checkPendingXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#213342" />
    <stroke android:width="2dp" android:color="#3D5568" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_check_pending.xml'), checkPendingXml);

      // 6. streak_widget_check_done.xml (Filled circle matching brand flame #FF9600 with white checkmark)
      const checkDoneXml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape android:shape="oval">
            <solid android:color="#FF9600" />
        </shape>
    </item>
    <item android:gravity="center" android:top="7dp" android:bottom="7dp" android:left="7dp" android:right="7dp">
        <vector android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
            <path android:fillColor="#FFFFFF" android:pathData="M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41,-1.41z"/>
        </vector>
    </item>
</layer-list>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_check_done.xml'), checkDoneXml);

      // 7. streak_widget_layout.xml (Duolingo 4x2 character-driven widget layout with accessible touch targets)
      const widgetLayoutXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/streak_widget_bg"
    android:paddingLeft="12dp"
    android:paddingRight="12dp"
    android:paddingTop="10dp"
    android:paddingBottom="10dp"
    android:contentDescription="StreakMate Home Screen Widget">

    <!-- ========================================================== -->
    <!-- Layout C: Celebration Container (When all habits are done) -->
    <!-- ========================================================== -->
    <LinearLayout
        android:id="@+id/celebration_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:visibility="gone">

        <!-- Left Mascot Stage -->
        <LinearLayout
            android:layout_width="88dp"
            android:layout_height="match_parent"
            android:orientation="vertical"
            android:gravity="center">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:background="@drawable/streak_widget_bubble_bg"
                android:paddingLeft="8dp"
                android:paddingRight="8dp"
                android:paddingTop="3dp"
                android:paddingBottom="3dp"
                android:text="GREAT JOB!"
                android:textColor="#FF9600"
                android:textSize="10sp"
                android:textStyle="bold" />

            <ImageView
                android:id="@+id/celebration_mascot"
                android:layout_width="66dp"
                android:layout_height="66dp"
                android:layout_marginTop="3dp"
                android:src="@drawable/widget_mascot_complete"
                android:scaleType="fitCenter"
                android:contentDescription="Nimbus celebrating completed habits" />
        </LinearLayout>

        <!-- Right Celebration Content Card -->
        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center_vertical"
            android:background="@drawable/streak_widget_item_card_bg"
            android:paddingLeft="12dp"
            android:paddingRight="12dp"
            android:paddingTop="8dp"
            android:paddingBottom="8dp"
            android:layout_marginLeft="8dp">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="100% COMPLETE"
                android:textColor="#FF9600"
                android:textSize="10sp"
                android:textStyle="bold"
                android:letterSpacing="0.08" />

            <TextView
                android:id="@+id/celebration_title"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="All Done Today!"
                android:textColor="#EDF3F1"
                android:textSize="15sp"
                android:textStyle="bold"
                android:layout_marginTop="2dp" />

            <TextView
                android:id="@+id/celebration_subtitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Streaks protected • See you tomorrow 🌤️"
                android:textColor="#77D2C5"
                android:textSize="11sp"
                android:layout_marginTop="2dp" />
        </LinearLayout>
    </LinearLayout>

    <!-- ========================================================== -->
    <!-- Layout A: Single Streak Hero Container (4x2 Mascot + Card) -->
    <!-- ========================================================== -->
    <LinearLayout
        android:id="@+id/single_streak_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:visibility="gone">

        <!-- Left Mascot Stage -->
        <LinearLayout
            android:layout_width="88dp"
            android:layout_height="match_parent"
            android:orientation="vertical"
            android:gravity="center">

            <TextView
                android:id="@+id/single_speech_bubble"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:background="@drawable/streak_widget_bubble_bg"
                android:paddingLeft="8dp"
                android:paddingRight="8dp"
                android:paddingTop="3dp"
                android:paddingBottom="3dp"
                android:text="Ready? ☀️"
                android:textColor="#77D2C5"
                android:textSize="10sp"
                android:textStyle="bold"
                android:maxLines="1"
                android:ellipsize="end" />

            <ImageView
                android:id="@+id/single_streak_mascot"
                android:layout_width="66dp"
                android:layout_height="66dp"
                android:layout_marginTop="3dp"
                android:src="@drawable/widget_mascot_morning"
                android:scaleType="fitCenter"
                android:contentDescription="Nimbus streak companion" />
        </LinearLayout>

        <!-- Right Hero Habit Card -->
        <LinearLayout
            android:id="@+id/single_streak_action_area"
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:background="@drawable/streak_widget_item_card_bg"
            android:paddingLeft="12dp"
            android:paddingRight="12dp"
            android:paddingTop="8dp"
            android:paddingBottom="8dp"
            android:layout_marginLeft="8dp"
            android:contentDescription="Open streak details">

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:orientation="vertical">

                <TextView
                    android:id="@+id/single_streak_name"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Daily Habit"
                    android:textColor="#EDF3F1"
                    android:textSize="15sp"
                    android:textStyle="bold"
                    android:maxLines="1"
                    android:ellipsize="end" />

                <LinearLayout
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:orientation="horizontal"
                    android:gravity="bottom"
                    android:layout_marginTop="2dp">

                    <TextView
                        android:id="@+id/single_streak_number"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="14"
                        android:textColor="#FFA21A"
                        android:textSize="26sp"
                        android:textStyle="bold" />

                    <TextView
                        android:id="@+id/single_streak_unit"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="days 🔥"
                        android:textColor="#9EB3AF"
                        android:textSize="11sp"
                        android:layout_marginLeft="5dp"
                        android:layout_marginBottom="3dp" />
                </LinearLayout>

                <TextView
                    android:id="@+id/single_streak_status"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Tap button to check in"
                    android:textColor="#77D2C5"
                    android:textSize="11sp"
                    android:layout_marginTop="1dp"
                    android:maxLines="1"
                    android:ellipsize="end" />
            </LinearLayout>

            <!-- Accessible 48dp check-in touch target -->
            <FrameLayout
                android:id="@+id/single_streak_checkbox_touch_area"
                android:layout_width="48dp"
                android:layout_height="48dp"
                android:layout_marginLeft="6dp">

                <ImageView
                    android:id="@+id/single_streak_checkbox"
                    android:layout_width="38dp"
                    android:layout_height="38dp"
                    android:layout_gravity="center"
                    android:src="@drawable/streak_widget_check_pending"
                    android:contentDescription="Check in for habit" />
            </FrameLayout>
        </LinearLayout>
    </LinearLayout>

    <!-- ========================================================== -->
    <!-- Layout B: Two Streaks Container (Duolingo 4x2 Duo Cards)   -->
    <!-- ========================================================== -->
    <LinearLayout
        android:id="@+id/two_streak_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:visibility="visible">

        <!-- Left Mascot Stage -->
        <LinearLayout
            android:layout_width="88dp"
            android:layout_height="match_parent"
            android:orientation="vertical"
            android:gravity="center">

            <!-- Speech bubble -->
            <TextView
                android:id="@+id/two_speech_bubble"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:background="@drawable/streak_widget_bubble_bg"
                android:paddingLeft="8dp"
                android:paddingRight="8dp"
                android:paddingTop="3dp"
                android:paddingBottom="3dp"
                android:text="2 HABITS! ✨"
                android:textColor="#77D2C5"
                android:textSize="10sp"
                android:textStyle="bold"
                android:maxLines="1"
                android:ellipsize="end" />

            <!-- Mascot Character -->
            <ImageView
                android:id="@+id/two_streak_mascot"
                android:layout_width="66dp"
                android:layout_height="66dp"
                android:layout_marginTop="3dp"
                android:src="@drawable/widget_mascot_morning"
                android:scaleType="fitCenter"
                android:contentDescription="Nimbus duo streak companion" />
        </LinearLayout>

        <!-- Right Column: Two distinct elevated habit cards -->
        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center_vertical"
            android:layout_marginLeft="8dp">

            <!-- Habit 1 Card -->
            <LinearLayout
                android:id="@+id/two_streak_1_card"
                android:layout_width="match_parent"
                android:layout_height="0dp"
                android:layout_weight="1"
                android:orientation="horizontal"
                android:gravity="center_vertical"
                android:background="@drawable/streak_widget_item_card_bg"
                android:paddingLeft="10dp"
                android:paddingRight="8dp"
                android:paddingTop="4dp"
                android:paddingBottom="4dp"
                android:contentDescription="Habit 1 card">

                <LinearLayout
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_weight="1"
                    android:orientation="vertical">

                    <TextView
                        android:id="@+id/two_streak_1_name"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="Habit 1"
                        android:textColor="#EDF3F1"
                        android:textSize="13sp"
                        android:textStyle="bold"
                        android:maxLines="1"
                        android:ellipsize="end" />

                    <LinearLayout
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:orientation="horizontal"
                        android:gravity="center_vertical">

                        <TextView
                            android:id="@+id/two_streak_1_count"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="14 days 🔥"
                            android:textColor="#FFA21A"
                            android:textSize="11sp"
                            android:textStyle="bold" />

                        <TextView
                            android:id="@+id/two_streak_1_status"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="• Pending"
                            android:textColor="#77D2C5"
                            android:textSize="10sp"
                            android:layout_marginLeft="4dp"
                            android:maxLines="1"
                            android:ellipsize="end" />
                    </LinearLayout>
                </LinearLayout>

                <!-- 44dp Touch Target -->
                <FrameLayout
                    android:id="@+id/two_streak_1_checkbox_touch_area"
                    android:layout_width="44dp"
                    android:layout_height="44dp"
                    android:layout_marginLeft="4dp">

                    <ImageView
                        android:id="@+id/two_streak_1_checkbox"
                        android:layout_width="32dp"
                        android:layout_height="32dp"
                        android:layout_gravity="center"
                        android:src="@drawable/streak_widget_check_pending"
                        android:contentDescription="Check in for habit 1" />
                </FrameLayout>
            </LinearLayout>

            <!-- Habit 2 Card with 6dp top margin for separation -->
            <LinearLayout
                android:id="@+id/two_streak_2_card"
                android:layout_width="match_parent"
                android:layout_height="0dp"
                android:layout_weight="1"
                android:orientation="horizontal"
                android:gravity="center_vertical"
                android:background="@drawable/streak_widget_item_card_bg"
                android:paddingLeft="10dp"
                android:paddingRight="8dp"
                android:paddingTop="4dp"
                android:paddingBottom="4dp"
                android:layout_marginTop="6dp"
                android:contentDescription="Habit 2 card">

                <LinearLayout
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_weight="1"
                    android:orientation="vertical">

                    <TextView
                        android:id="@+id/two_streak_2_name"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="Habit 2"
                        android:textColor="#EDF3F1"
                        android:textSize="13sp"
                        android:textStyle="bold"
                        android:maxLines="1"
                        android:ellipsize="end" />

                    <LinearLayout
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:orientation="horizontal"
                        android:gravity="center_vertical">

                        <TextView
                            android:id="@+id/two_streak_2_count"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="7 days 🔥"
                            android:textColor="#FFA21A"
                            android:textSize="11sp"
                            android:textStyle="bold" />

                        <TextView
                            android:id="@+id/two_streak_2_status"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="• Pending"
                            android:textColor="#77D2C5"
                            android:textSize="10sp"
                            android:layout_marginLeft="4dp"
                            android:maxLines="1"
                            android:ellipsize="end" />
                    </LinearLayout>
                </LinearLayout>

                <!-- 44dp Touch Target -->
                <FrameLayout
                    android:id="@+id/two_streak_2_checkbox_touch_area"
                    android:layout_width="44dp"
                    android:layout_height="44dp"
                    android:layout_marginLeft="4dp">

                    <ImageView
                        android:id="@+id/two_streak_2_checkbox"
                        android:layout_width="32dp"
                        android:layout_height="32dp"
                        android:layout_gravity="center"
                        android:src="@drawable/streak_widget_check_pending"
                        android:contentDescription="Check in for habit 2" />
                </FrameLayout>
            </LinearLayout>
        </LinearLayout>
    </LinearLayout>

    <!-- ========================================================== -->
    <!-- Empty Container                                            -->
    <!-- ========================================================== -->
    <LinearLayout
        android:id="@+id/empty_widget_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:visibility="gone">

        <ImageView
            android:layout_width="60dp"
            android:layout_height="60dp"
            android:src="@drawable/widget_mascot_morning"
            android:scaleType="fitCenter"
            android:contentDescription="Nimbus waiting" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:layout_marginLeft="12dp">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="No habits pinned"
                android:textColor="#EDF3F1"
                android:textSize="14sp"
                android:textStyle="bold" />

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Tap to select habits in StreakMate"
                android:textColor="#9EB3AF"
                android:textSize="11sp"
                android:layout_marginTop="2dp" />
        </LinearLayout>
    </LinearLayout>
</LinearLayout>
`;
      fs.writeFileSync(path.join(layoutDir, 'streak_widget_layout.xml'), widgetLayoutXml);

      // 8. StreakWidgetProvider.kt (Native broadcast check-ins, social accountability, midnight rollover)
      const providerKt = `package com.streakmate.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class StreakWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_WIDGET_CHECKIN = "com.streakmate.app.ACTION_WIDGET_CHECKIN"
        const val EXTRA_STREAK_ID = "streak_id"
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_WIDGET_CHECKIN) {
            val streakId = intent.getStringExtra(EXTRA_STREAK_ID)
            if (!streakId.isNullOrEmpty()) {
                handleNativeCheckIn(context, streakId)
            }
        } else if (intent.action == Intent.ACTION_DATE_CHANGED ||
                   intent.action == Intent.ACTION_TIMEZONE_CHANGED ||
                   intent.action == Intent.ACTION_TIME_SET ||
                   intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, StreakWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (appWidgetIds.isNotEmpty()) {
                onUpdate(context, appWidgetManager, appWidgetIds)
            }
        }
    }

    private fun handleNativeCheckIn(context: Context, streakId: String) {
        val prefs = context.getSharedPreferences("StreakWidgetPrefs", Context.MODE_PRIVATE)
        val rawJson = prefs.getString("widget_data", null) ?: return

        try {
            val root = JSONObject(rawJson)
            val streaks = root.optJSONArray("streaks") ?: return
            var changed = false

            for (i in 0 until streaks.length()) {
                val s = streaks.getJSONObject(i)
                val id = s.optString("id", "")
                if (id == streakId && !s.optBoolean("userCheckedIn", false)) {
                    s.put("userCheckedIn", true)
                    val current = s.optInt("currentStreak", 0)
                    val isSolo = s.optBoolean("isSolo", true)
                    val friendChecked = s.optBoolean("friendCheckedIn", false)
                    if (isSolo || friendChecked) {
                        s.put("currentStreak", current + 1)
                    }
                    changed = true
                    break
                }
            }

            if (changed) {
                // Record in pending queue for background sync with Firestore
                val pendingRaw = prefs.getString("pending_checkins", "[]")
                val pendingArray = try { JSONArray(pendingRaw) } catch (e: Exception) { JSONArray() }
                val item = JSONObject()
                item.put("streakId", streakId)
                item.put("timestamp", System.currentTimeMillis())
                pendingArray.put(item)

                prefs.edit()
                    .putString("widget_data", root.toString())
                    .putString("pending_checkins", pendingArray.toString())
                    .apply()

                // Immediate UI refresh
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, StreakWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                onUpdate(context, appWidgetManager, appWidgetIds)
            }
        } catch (e: Exception) {
            Log.e("StreakWidgetProvider", "Native check-in error", e)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("StreakWidgetPrefs", Context.MODE_PRIVATE)
        val rawJson = prefs.getString("widget_data", null)

        val cal = Calendar.getInstance()
        val hour = cal.get(Calendar.HOUR_OF_DAY)

        // Time-of-day mascot selection & speech bubble defaults
        val mascotResId: Int
        val speechBubbleTextSingle: String
        val speechBubbleTextTwo: String
        when {
            hour in 5..11 -> {
                mascotResId = R.drawable.widget_mascot_morning
                speechBubbleTextSingle = "Ready? ☀️"
                speechBubbleTextTwo = "2 HABITS! ✨"
            }
            hour in 12..16 -> {
                mascotResId = R.drawable.widget_mascot_afternoon
                speechBubbleTextSingle = "Keep going! 🌤️"
                speechBubbleTextTwo = "Keep going! 🌤️"
            }
            hour in 17..20 -> {
                mascotResId = R.drawable.widget_mascot_evening
                speechBubbleTextSingle = "Check in! ⏰"
                speechBubbleTextTwo = "Check in! ⏰"
            }
            else -> {
                mascotResId = R.drawable.widget_mascot_night
                speechBubbleTextSingle = "Save streak! 🌙"
                speechBubbleTextTwo = "Save both! 🌙"
            }
        }

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.streak_widget_layout)

                // Base open app intent on widget background tap
                val openAppIntent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://widget")).apply {
                    setPackage(context.packageName)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val openAppPendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, openAppPendingIntent)

                var streaksArray: JSONArray? = null
                if (!rawJson.isNullOrEmpty()) {
                    try {
                        val rootObj = JSONObject(rawJson)
                        streaksArray = rootObj.optJSONArray("streaks")
                    } catch (e: Exception) {
                        Log.e("StreakWidgetProvider", "Failed to parse widget json", e)
                    }
                }

                val streakCount = streaksArray?.length() ?: 0

                // Check if all pinned habits are checked in today
                var allCompleted = streakCount > 0
                var partnerCheckedInSomeonePending = false
                var userCheckedWaitingPartner = false

                for (i in 0 until streakCount) {
                    val s = streaksArray!!.getJSONObject(i)
                    val userDone = s.optBoolean("userCheckedIn", false)
                    val friendDone = s.optBoolean("friendCheckedIn", false)
                    val isSolo = s.optBoolean("isSolo", true)

                    if (!userDone) {
                        allCompleted = false
                        if (!isSolo && friendDone) {
                            partnerCheckedInSomeonePending = true
                        }
                    } else if (!isSolo && !friendDone) {
                        userCheckedWaitingPartner = true
                    }
                }

                if (streakCount == 0) {
                    // Empty state
                    views.setViewVisibility(R.id.celebration_container, View.GONE)
                    views.setViewVisibility(R.id.single_streak_container, View.GONE)
                    views.setViewVisibility(R.id.two_streak_container, View.GONE)
                    views.setViewVisibility(R.id.empty_widget_container, View.VISIBLE)
                } else if (allCompleted) {
                    // Layout C: Celebration Widget
                    views.setViewVisibility(R.id.empty_widget_container, View.GONE)
                    views.setViewVisibility(R.id.single_streak_container, View.GONE)
                    views.setViewVisibility(R.id.two_streak_container, View.GONE)
                    views.setViewVisibility(R.id.celebration_container, View.VISIBLE)

                    views.setImageViewResource(R.id.celebration_mascot, R.drawable.widget_mascot_complete)
                    views.setTextViewText(R.id.celebration_title, "All Done Today!")
                    views.setTextViewText(
                        R.id.celebration_subtitle,
                        if (streakCount == 1) "Habit completed! Streak protected 🌤️" else "All habits completed! Momentum secured 🌤️"
                    )
                } else if (streakCount == 1) {
                    // Layout A: Single Streak (Hero Mascot)
                    views.setViewVisibility(R.id.celebration_container, View.GONE)
                    views.setViewVisibility(R.id.empty_widget_container, View.GONE)
                    views.setViewVisibility(R.id.two_streak_container, View.GONE)
                    views.setViewVisibility(R.id.single_streak_container, View.VISIBLE)

                    views.setImageViewResource(R.id.single_streak_mascot, mascotResId)

                    val streakObj = streaksArray!!.getJSONObject(0)
                    val streakId = streakObj.optString("id", "")
                    val name = streakObj.optString("name", "Daily Habit")
                    val count = streakObj.optInt("currentStreak", 0)
                    val isCheckedIn = streakObj.optBoolean("userCheckedIn", false)
                    val isSolo = streakObj.optBoolean("isSolo", true)
                    val friendCheckedIn = streakObj.optBoolean("friendCheckedIn", false)
                    val friendName = streakObj.optString("friendName", "Partner")
                    val hoursRemaining = streakObj.optInt("hoursRemaining", 4)

                    views.setTextViewText(R.id.single_streak_name, name)
                    views.setTextViewText(R.id.single_streak_number, "$count")
                    views.setTextViewText(R.id.single_streak_unit, if (count == 1) "day 🔥" else "days 🔥")

                    // Status and accountability text
                    val statusText: String
                    val bubbleText: String
                    if (isSolo) {
                        if (isCheckedIn) {
                            statusText = "Completed today ✓"
                            bubbleText = "Crushed it! 🎉"
                        } else {
                            statusText = "$hoursRemaining hrs remaining today"
                            bubbleText = speechBubbleTextSingle
                        }
                    } else {
                        if (isCheckedIn && friendCheckedIn) {
                            statusText = "Both completed today! 🔥"
                            bubbleText = "Team victory! ✨"
                        } else if (isCheckedIn && !friendCheckedIn) {
                            statusText = "Waiting for $friendName ⏳"
                            bubbleText = "Nudge $friendName! ⏰"
                        } else if (!isCheckedIn && friendCheckedIn) {
                            statusText = "$friendName checked in! Your turn ⚡"
                            bubbleText = "$friendName did it! 🔥"
                        } else {
                            statusText = "Both pending • $hoursRemaining hrs left"
                            bubbleText = speechBubbleTextSingle
                        }
                    }

                    views.setTextViewText(R.id.single_streak_status, statusText)
                    views.setTextViewText(R.id.single_speech_bubble, bubbleText)

                    if (isCheckedIn) {
                        views.setImageViewResource(R.id.single_streak_checkbox, R.drawable.streak_widget_check_done)
                        views.setContentDescription(R.id.single_streak_checkbox, "Completed: $name")
                    } else {
                        views.setImageViewResource(R.id.single_streak_checkbox, R.drawable.streak_widget_check_pending)
                        views.setContentDescription(R.id.single_streak_checkbox, "Check in for $name")
                    }

                    // 1. One-tap instant broadcast action for checkbox
                    val broadcastIntent = Intent(context, StreakWidgetProvider::class.java).apply {
                        action = ACTION_WIDGET_CHECKIN
                        putExtra(EXTRA_STREAK_ID, streakId)
                    }
                    val broadcastPending = PendingIntent.getBroadcast(
                        context,
                        101,
                        broadcastIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.single_streak_checkbox, broadcastPending)
                    views.setOnClickPendingIntent(R.id.single_streak_checkbox_touch_area, broadcastPending)

                    // 2. Tapping the card opens the streak screen in app
                    val openStreakIntent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://streak/" + (if (streakId.isNotEmpty()) streakId else "quick_1"))).apply {
                        setPackage(context.packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val openStreakPending = PendingIntent.getActivity(
                        context,
                        102,
                        openStreakIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.single_streak_action_area, openStreakPending)

                } else {
                    // Layout B: Two Streaks (Duolingo 4x2 Duo Layout)
                    views.setViewVisibility(R.id.celebration_container, View.GONE)
                    views.setViewVisibility(R.id.empty_widget_container, View.GONE)
                    views.setViewVisibility(R.id.single_streak_container, View.GONE)
                    views.setViewVisibility(R.id.two_streak_container, View.VISIBLE)

                    views.setImageViewResource(R.id.two_streak_mascot, mascotResId)

                    // Streak 1
                    val s1 = streaksArray!!.getJSONObject(0)
                    val s1Id = s1.optString("id", "quick_1")
                    val s1Name = s1.optString("name", "Habit 1")
                    val s1Count = s1.optInt("currentStreak", 0)
                    val s1Checked = s1.optBoolean("userCheckedIn", false)
                    val s1Solo = s1.optBoolean("isSolo", true)
                    val s1FriendChecked = s1.optBoolean("friendCheckedIn", false)
                    val s1FriendName = s1.optString("friendName", "Partner")
                    val s1Hours = s1.optInt("hoursRemaining", 4)

                    views.setTextViewText(R.id.two_streak_1_name, s1Name)
                    views.setTextViewText(R.id.two_streak_1_count, "$s1Count " + (if (s1Count == 1) "day 🔥" else "days 🔥"))

                    val s1Status: String = if (s1Solo) {
                        if (s1Checked) "• Done ✓" else "• $s1Hours hrs left"
                    } else {
                        if (s1Checked && s1FriendChecked) "• Both done ✓"
                        else if (s1Checked && !s1FriendChecked) "• Waiting for $s1FriendName"
                        else if (!s1Checked && s1FriendChecked) "• $s1FriendName done!"
                        else "• Both pending"
                    }
                    views.setTextViewText(R.id.two_streak_1_status, s1Status)

                    if (s1Checked) {
                        views.setImageViewResource(R.id.two_streak_1_checkbox, R.drawable.streak_widget_check_done)
                        views.setContentDescription(R.id.two_streak_1_checkbox, "Completed: $s1Name")
                    } else {
                        views.setImageViewResource(R.id.two_streak_1_checkbox, R.drawable.streak_widget_check_pending)
                        views.setContentDescription(R.id.two_streak_1_checkbox, "Check in for $s1Name")
                    }

                    // Native broadcast for Streak 1 checkbox
                    val bIntent1 = Intent(context, StreakWidgetProvider::class.java).apply {
                        action = ACTION_WIDGET_CHECKIN
                        putExtra(EXTRA_STREAK_ID, s1Id)
                    }
                    val bPending1 = PendingIntent.getBroadcast(
                        context,
                        201,
                        bIntent1,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.two_streak_1_checkbox, bPending1)
                    views.setOnClickPendingIntent(R.id.two_streak_1_checkbox_touch_area, bPending1)

                    // Open Streak 1 on card tap
                    val card1Intent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://streak/$s1Id")).apply {
                        setPackage(context.packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val card1Pending = PendingIntent.getActivity(
                        context,
                        202,
                        card1Intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.two_streak_1_card, card1Pending)

                    // Streak 2
                    val s2 = streaksArray.getJSONObject(1)
                    val s2Id = s2.optString("id", "quick_2")
                    val s2Name = s2.optString("name", "Habit 2")
                    val s2Count = s2.optInt("currentStreak", 0)
                    val s2Checked = s2.optBoolean("userCheckedIn", false)
                    val s2Solo = s2.optBoolean("isSolo", true)
                    val s2FriendChecked = s2.optBoolean("friendCheckedIn", false)
                    val s2FriendName = s2.optString("friendName", "Partner")
                    val s2Hours = s2.optInt("hoursRemaining", 4)

                    views.setTextViewText(R.id.two_streak_2_name, s2Name)
                    views.setTextViewText(R.id.two_streak_2_count, "$s2Count " + (if (s2Count == 1) "day 🔥" else "days 🔥"))

                    val s2Status: String = if (s2Solo) {
                        if (s2Checked) "• Done ✓" else "• $s2Hours hrs left"
                    } else {
                        if (s2Checked && s2FriendChecked) "• Both done ✓"
                        else if (s2Checked && !s2FriendChecked) "• Waiting for $s2FriendName"
                        else if (!s2Checked && s2FriendChecked) "• $s2FriendName done!"
                        else "• Both pending"
                    }
                    views.setTextViewText(R.id.two_streak_2_status, s2Status)

                    if (s2Checked) {
                        views.setImageViewResource(R.id.two_streak_2_checkbox, R.drawable.streak_widget_check_done)
                        views.setContentDescription(R.id.two_streak_2_checkbox, "Completed: $s2Name")
                    } else {
                        views.setImageViewResource(R.id.two_streak_2_checkbox, R.drawable.streak_widget_check_pending)
                        views.setContentDescription(R.id.two_streak_2_checkbox, "Check in for $s2Name")
                    }

                    // Native broadcast for Streak 2 checkbox
                    val bIntent2 = Intent(context, StreakWidgetProvider::class.java).apply {
                        action = ACTION_WIDGET_CHECKIN
                        putExtra(EXTRA_STREAK_ID, s2Id)
                    }
                    val bPending2 = PendingIntent.getBroadcast(
                        context,
                        203,
                        bIntent2,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.two_streak_2_checkbox, bPending2)
                    views.setOnClickPendingIntent(R.id.two_streak_2_checkbox_touch_area, bPending2)

                    // Open Streak 2 on card tap
                    val card2Intent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://streak/$s2Id")).apply {
                        setPackage(context.packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val card2Pending = PendingIntent.getActivity(
                        context,
                        204,
                        card2Intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.two_streak_2_card, card2Pending)

                    // Dynamic speech bubble
                    val completedCount = (if (s1Checked) 1 else 0) + (if (s2Checked) 1 else 0)
                    val twoSpeech = when {
                        partnerCheckedInSomeonePending -> "Friend did it! 🔥"
                        userCheckedWaitingPartner -> "Nudge partner! ⏰"
                        completedCount == 1 -> "1 left! 🔥"
                        else -> speechBubbleTextTwo
                    }
                    views.setTextViewText(R.id.two_speech_bubble, twoSpeech)
                }

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e("StreakWidgetProvider", "Error updating widget", e)
            }
        }
    }
}
`;
      fs.writeFileSync(path.join(javaDir, 'StreakWidgetProvider.kt'), providerKt);

      // 9. StreakWidgetModule.kt (NativeModule with pending check-in queue & logout data cleanup)
      const moduleKt = `package com.streakmate.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class StreakWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "StreakWidgetModule"

    @ReactMethod
    fun updateWidgetData(jsonData: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("StreakWidgetPrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("widget_data", jsonData).apply()

        // Trigger widget update broadcast immediately
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = ComponentName(context, StreakWidgetProvider::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        val intent = Intent(context, StreakWidgetProvider::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
        }
        context.sendBroadcast(intent)
    }

    @ReactMethod
    fun getPendingCheckIns(promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences("StreakWidgetPrefs", Context.MODE_PRIVATE)
            val raw = prefs.getString("pending_checkins", "[]")
            promise.resolve(raw)
        } catch (e: Exception) {
            promise.reject("GET_PENDING_ERROR", e.message)
        }
    }

    @ReactMethod
    fun clearPendingCheckIns(promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences("StreakWidgetPrefs", Context.MODE_PRIVATE)
            prefs.edit().remove("pending_checkins").apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_PENDING_ERROR", e.message)
        }
    }

    @ReactMethod
    fun clearWidgetData(promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences("StreakWidgetPrefs", Context.MODE_PRIVATE)
            prefs.edit().clear().apply()

            // Refresh widget to empty state
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, StreakWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            val intent = Intent(context, StreakWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
            }
            context.sendBroadcast(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_WIDGET_ERROR", e.message)
        }
    }
}
`;
      fs.writeFileSync(path.join(javaDir, 'StreakWidgetModule.kt'), moduleKt);

      // 10. StreakWidgetPackage.kt (ReactPackage registering StreakWidgetModule)
      const packageKt = `package com.streakmate.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class StreakWidgetPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(StreakWidgetModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;
      fs.writeFileSync(path.join(javaDir, 'StreakWidgetPackage.kt'), packageKt);

      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidWidget;
