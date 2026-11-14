const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidWidget = (config) => {
  // 1. Modify AndroidManifest.xml to register StreakWidgetProvider receiver
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

      // 1. streak_widget_info.xml
      const widgetInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="86dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/streak_widget_layout"
    android:previewImage="@mipmap/ic_launcher"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>
`;
      fs.writeFileSync(path.join(xmlDir, 'streak_widget_info.xml'), widgetInfoXml);

      // 2. streak_widget_bg.xml (Rich Soft Sky: #172430 surface, #2A4053 border, 24dp corners)
      const widgetBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#172430" />
    <stroke android:width="1.5dp" android:color="#2A4053" />
    <corners android:radius="24dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_bg.xml'), widgetBgXml);

      // 3. streak_widget_bubble_bg.xml (Cute speech bubble)
      const bubbleBgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#293E50" />
    <stroke android:width="1dp" android:color="#3A566E" />
    <corners android:radius="12dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_bubble_bg.xml'), bubbleBgXml);

      // 4. streak_widget_check_pending.xml (Subtle circular action button)
      const checkPendingXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#213342" />
    <stroke android:width="2dp" android:color="#3D5568" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'streak_widget_check_pending.xml'), checkPendingXml);

      // 5. streak_widget_check_done.xml (Filled circle matching brand logo flame color #FF9600 with white checkmark)
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

      // 6. streak_widget_layout.xml (Duolingo-level character-driven widget)
      const widgetLayoutXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/streak_widget_bg"
    android:paddingLeft="14dp"
    android:paddingRight="14dp"
    android:paddingTop="12dp"
    android:paddingBottom="12dp">

    <!-- Layout C: Celebration Container (Shown when all pinned habits done!) -->
    <LinearLayout
        android:id="@+id/celebration_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:visibility="gone">

        <ImageView
            android:id="@+id/celebration_mascot"
            android:layout_width="66dp"
            android:layout_height="66dp"
            android:src="@drawable/widget_mascot_complete"
            android:scaleType="fitCenter" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:layout_marginLeft="10dp">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="100% COMPLETE ⭐"
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
                android:textSize="16sp"
                android:textStyle="bold"
                android:layout_marginTop="1dp" />

            <TextView
                android:id="@+id/celebration_subtitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Streak protected • See you tomorrow 🌤️"
                android:textColor="#77D2C5"
                android:textSize="11sp"
                android:layout_marginTop="2dp" />
        </LinearLayout>
    </LinearLayout>

    <!-- Layout A: Single Streak Hero Container -->
    <LinearLayout
        android:id="@+id/single_streak_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical"
        android:visibility="visible">

        <!-- Header with speech bubble -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:layout_marginBottom="6dp">

            <TextView
                android:id="@+id/single_speech_bubble"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:background="@drawable/streak_widget_bubble_bg"
                android:paddingLeft="8dp"
                android:paddingRight="8dp"
                android:paddingTop="3dp"
                android:paddingBottom="3dp"
                android:text="Ready to conquer today? ☀️"
                android:textColor="#77D2C5"
                android:textSize="10sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/single_header_date"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:gravity="end"
                android:text="TODAY • 1 HABIT"
                android:textColor="#9EB3AF"
                android:textSize="10sp"
                android:textStyle="bold"
                android:letterSpacing="0.08" />
        </LinearLayout>

        <!-- Mascot + Info + Button Row -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="0dp"
            android:layout_weight="1"
            android:orientation="horizontal"
            android:gravity="center_vertical">

            <ImageView
                android:id="@+id/single_streak_mascot"
                android:layout_width="60dp"
                android:layout_height="60dp"
                android:src="@drawable/widget_mascot_morning"
                android:scaleType="fitCenter" />

            <LinearLayout
                android:id="@+id/single_streak_action_area"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:orientation="vertical"
                android:layout_marginLeft="8dp">

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
                    android:layout_marginTop="1dp">

                    <TextView
                        android:id="@+id/single_streak_number"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="1"
                        android:textColor="#FFA21A"
                        android:textSize="28sp"
                        android:textStyle="bold" />

                    <TextView
                        android:id="@+id/single_streak_unit"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="day streak"
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
                    android:textSize="11sp" />
            </LinearLayout>

            <ImageView
                android:id="@+id/single_streak_checkbox"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:src="@drawable/streak_widget_check_pending"
                android:layout_marginLeft="6dp" />
        </LinearLayout>
    </LinearLayout>

    <!-- Layout B: Two Streaks Container (Duo Rhythm Primary) -->
    <LinearLayout
        android:id="@+id/two_streak_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical"
        android:visibility="gone">

        <!-- Header with Mini Nimbus Avatar -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:layout_marginBottom="4dp">

            <ImageView
                android:id="@+id/two_mascot_avatar"
                android:layout_width="26dp"
                android:layout_height="26dp"
                android:src="@drawable/widget_mascot_morning"
                android:scaleType="fitCenter" />

            <TextView
                android:id="@+id/two_speech_bubble"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:background="@drawable/streak_widget_bubble_bg"
                android:paddingLeft="7dp"
                android:paddingRight="7dp"
                android:paddingTop="2dp"
                android:paddingBottom="2dp"
                android:text="Keep it going! ✨"
                android:textColor="#77D2C5"
                android:textSize="10sp"
                android:textStyle="bold"
                android:layout_marginLeft="4dp" />

            <TextView
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:gravity="end"
                android:text="2 HABITS"
                android:textColor="#9EB3AF"
                android:textSize="10sp"
                android:textStyle="bold"
                android:letterSpacing="0.08" />
        </LinearLayout>

        <!-- Row 1 -->
        <LinearLayout
            android:id="@+id/two_streak_1_row"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:paddingTop="2dp"
            android:paddingBottom="2dp">

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
                    android:textSize="14sp"
                    android:textStyle="bold"
                    android:maxLines="1"
                    android:ellipsize="end" />

                <TextView
                    android:id="@+id/two_streak_1_count"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="14 days"
                    android:textColor="#FFA21A"
                    android:textSize="12sp" />
            </LinearLayout>

            <ImageView
                android:id="@+id/two_streak_1_checkbox"
                android:layout_width="34dp"
                android:layout_height="34dp"
                android:src="@drawable/streak_widget_check_pending"
                android:layout_marginLeft="8dp" />
        </LinearLayout>

        <!-- Divider -->
        <ImageView
            android:layout_width="match_parent"
            android:layout_height="1dp"
            android:background="#223642"
            android:layout_marginTop="3dp"
            android:layout_marginBottom="3dp" />

        <!-- Row 2 -->
        <LinearLayout
            android:id="@+id/two_streak_2_row"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:paddingTop="2dp"
            android:paddingBottom="2dp">

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
                    android:textSize="14sp"
                    android:textStyle="bold"
                    android:maxLines="1"
                    android:ellipsize="end" />

                <TextView
                    android:id="@+id/two_streak_2_count"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="7 days"
                    android:textColor="#FFA21A"
                    android:textSize="12sp" />
            </LinearLayout>

            <ImageView
                android:id="@+id/two_streak_2_checkbox"
                android:layout_width="34dp"
                android:layout_height="34dp"
                android:src="@drawable/streak_widget_check_pending"
                android:layout_marginLeft="8dp" />
        </LinearLayout>
    </LinearLayout>

    <!-- Empty Container -->
    <LinearLayout
        android:id="@+id/empty_widget_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical"
        android:gravity="center"
        android:visibility="gone">

        <ImageView
            android:layout_width="48dp"
            android:layout_height="48dp"
            android:src="@drawable/widget_mascot_morning"
            android:scaleType="fitCenter" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="No habits pinned"
            android:textColor="#EDF3F1"
            android:textSize="13sp"
            android:textStyle="bold"
            android:layout_marginTop="4dp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Tap to select habits in StreakMate"
            android:textColor="#9EB3AF"
            android:textSize="11sp" />
    </LinearLayout>
</LinearLayout>
`;
      fs.writeFileSync(path.join(layoutDir, 'streak_widget_layout.xml'), widgetLayoutXml);

      // 7. StreakWidgetProvider.kt
      const providerKt = `package com.streakmate.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
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

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("StreakWidgetPrefs", Context.MODE_PRIVATE)
        val rawJson = prefs.getString("widget_data", null)

        val cal = Calendar.getInstance()
        val hour = cal.get(Calendar.HOUR_OF_DAY)

        // Time-of-day mascot selection & speech bubble
        val mascotResId: Int
        val speechBubbleText: String
        when {
            hour in 5..11 -> {
                mascotResId = R.drawable.widget_mascot_morning
                speechBubbleText = "Good morning! Ready? ✨"
            }
            hour in 12..16 -> {
                mascotResId = R.drawable.widget_mascot_afternoon
                speechBubbleText = "Keep it going! 🌤️"
            }
            hour in 17..20 -> {
                mascotResId = R.drawable.widget_mascot_evening
                speechBubbleText = "Check in tonight! ⏰"
            }
            else -> {
                mascotResId = R.drawable.widget_mascot_night
                speechBubbleText = "Save our streak! 🌙"
            }
        }

        val dateFormat = SimpleDateFormat("EEE, MMM d", Locale.getDefault())
        val todayDate = dateFormat.format(Date()).uppercase(Locale.getDefault())

        for (appWidgetId in appWidgetIds) {
            try {
                val views = RemoteViews(context.packageName, R.layout.streak_widget_layout)

                // Base open app intent on widget card tap
                val openAppIntent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://checkin/quick")).apply {
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
                for (i in 0 until streakCount) {
                    val s = streaksArray!!.getJSONObject(i)
                    if (!s.optBoolean("userCheckedIn", false)) {
                        allCompleted = false
                        break
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
                    views.setTextViewText(R.id.celebration_title, "All Done Today! ⭐")
                    views.setTextViewText(
                        R.id.celebration_subtitle,
                        if (streakCount == 1) "Habit completed! Streak protected 🌤️" else "Both habits completed! Momentum secured 🌤️"
                    )
                } else if (streakCount == 1) {
                    // Layout A: Single Streak (Hero Mascot)
                    views.setViewVisibility(R.id.celebration_container, View.GONE)
                    views.setViewVisibility(R.id.empty_widget_container, View.GONE)
                    views.setViewVisibility(R.id.two_streak_container, View.GONE)
                    views.setViewVisibility(R.id.single_streak_container, View.VISIBLE)

                    views.setImageViewResource(R.id.single_streak_mascot, mascotResId)
                    views.setTextViewText(R.id.single_speech_bubble, speechBubbleText)
                    views.setTextViewText(R.id.single_header_date, "TODAY • $todayDate")

                    val streakObj = streaksArray!!.getJSONObject(0)
                    val streakId = streakObj.optString("id", "")
                    val name = streakObj.optString("name", "Daily Habit")
                    val count = streakObj.optInt("currentStreak", 0)
                    val isCheckedIn = streakObj.optBoolean("userCheckedIn", false)

                    views.setTextViewText(R.id.single_streak_name, name)
                    views.setTextViewText(R.id.single_streak_number, "$count")
                    views.setTextViewText(R.id.single_streak_unit, if (count == 1) "day streak" else "days streak")

                    if (isCheckedIn) {
                        views.setTextViewText(R.id.single_streak_status, "Completed today ✓")
                        views.setImageViewResource(R.id.single_streak_checkbox, R.drawable.streak_widget_check_done)
                    } else {
                        views.setTextViewText(R.id.single_streak_status, "Tap button to check in")
                        views.setImageViewResource(R.id.single_streak_checkbox, R.drawable.streak_widget_check_pending)
                    }

                    val checkInIntent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://checkin/" + (if (streakId.isNotEmpty()) streakId else "quick_1"))).apply {
                        setPackage(context.packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val checkInPending = PendingIntent.getActivity(
                        context,
                        101,
                        checkInIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.single_streak_action_area, checkInPending)
                    views.setOnClickPendingIntent(R.id.single_streak_checkbox, checkInPending)

                } else {
                    // Layout B: Two Streaks (Duo Rhythm)
                    views.setViewVisibility(R.id.celebration_container, View.GONE)
                    views.setViewVisibility(R.id.empty_widget_container, View.GONE)
                    views.setViewVisibility(R.id.single_streak_container, View.GONE)
                    views.setViewVisibility(R.id.two_streak_container, View.VISIBLE)

                    views.setImageViewResource(R.id.two_mascot_avatar, mascotResId)
                    views.setTextViewText(R.id.two_speech_bubble, speechBubbleText)

                    // Streak 1
                    val s1 = streaksArray!!.getJSONObject(0)
                    val s1Id = s1.optString("id", "quick_1")
                    val s1Name = s1.optString("name", "Habit 1")
                    val s1Count = s1.optInt("currentStreak", 0)
                    val s1Checked = s1.optBoolean("userCheckedIn", false)

                    views.setTextViewText(R.id.two_streak_1_name, s1Name)
                    views.setTextViewText(R.id.two_streak_1_count, "$s1Count " + (if (s1Count == 1) "day" else "days"))
                    if (s1Checked) {
                        views.setImageViewResource(R.id.two_streak_1_checkbox, R.drawable.streak_widget_check_done)
                    } else {
                        views.setImageViewResource(R.id.two_streak_1_checkbox, R.drawable.streak_widget_check_pending)
                    }

                    val checkIn1Intent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://checkin/$s1Id")).apply {
                        setPackage(context.packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val checkIn1Pending = PendingIntent.getActivity(
                        context,
                        201,
                        checkIn1Intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.two_streak_1_checkbox, checkIn1Pending)

                    // Streak 2
                    val s2 = streaksArray.getJSONObject(1)
                    val s2Id = s2.optString("id", "quick_2")
                    val s2Name = s2.optString("name", "Habit 2")
                    val s2Count = s2.optInt("currentStreak", 0)
                    val s2Checked = s2.optBoolean("userCheckedIn", false)

                    views.setTextViewText(R.id.two_streak_2_name, s2Name)
                    views.setTextViewText(R.id.two_streak_2_count, "$s2Count " + (if (s2Count == 1) "day" else "days"))
                    if (s2Checked) {
                        views.setImageViewResource(R.id.two_streak_2_checkbox, R.drawable.streak_widget_check_done)
                    } else {
                        views.setImageViewResource(R.id.two_streak_2_checkbox, R.drawable.streak_widget_check_pending)
                    }

                    val checkIn2Intent = Intent(Intent.ACTION_VIEW, Uri.parse("streakmate://checkin/$s2Id")).apply {
                        setPackage(context.packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val checkIn2Pending = PendingIntent.getActivity(
                        context,
                        202,
                        checkIn2Intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.two_streak_2_checkbox, checkIn2Pending)
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

      // 8. StreakWidgetModule.kt (NativeModule to receive streak updates from React Native)
      const moduleKt = `package com.streakmate.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
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
}
`;
      fs.writeFileSync(path.join(javaDir, 'StreakWidgetModule.kt'), moduleKt);

      // 9. StreakWidgetPackage.kt (ReactPackage registering StreakWidgetModule)
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
