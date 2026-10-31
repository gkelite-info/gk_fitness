const {
  withAppBuildGradle,
  withMainApplication,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const packageContent = `package com.gkeliteinfo.gkgymlife.watch

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class WatchBridgePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(WatchBridgeModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

const moduleContent = `package com.gkeliteinfo.gkgymlife.watch

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import java.nio.charset.StandardCharsets

class WatchBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), MessageClient.OnMessageReceivedListener {

    init {
        try {
            Wearable.getMessageClient(reactContext).addListener(this)
        } catch (_: Exception) {
        }
    }

    override fun getName(): String = "WatchBridgeModule"

    override fun onMessageReceived(messageEvent: MessageEvent) {
        try {
            val path = messageEvent.path
            val dataString = String(messageEvent.data, StandardCharsets.UTF_8)

            val eventName = when (path) {
                "/gk/set-log" -> "Watch_SetLogReceived"
                "/gk/workout-complete" -> "Watch_WorkoutComplete"
                "/gk/heart-rate" -> "Watch_HeartRateReceived"
                else -> null
            }

            if (eventName != null) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(eventName, dataString)
            }
        } catch (_: Exception) {
        }
    }

    @ReactMethod
    fun getConnectionStatus(promise: Promise) {
        Thread {
            try {
                val nodeClient = Wearable.getNodeClient(reactContext)
                val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
                val isPaired = nodes.isNotEmpty()
                val isReachable = nodes.any { it.isNearby }
                val firstNode = nodes.firstOrNull()

                val result = Arguments.createMap().apply {
                    putBoolean("isPaired", isPaired)
                    putBoolean("isReachable", isReachable)
                    putString("deviceName", firstNode?.displayName)
                    putString("nodeId", firstNode?.id)
                    putString("platform", "wearos")
                }
                promise.resolve(result)
            } catch (e: Exception) {
                val fallback = Arguments.createMap().apply {
                    putBoolean("isPaired", false)
                    putBoolean("isReachable", false)
                    putNull("deviceName")
                    putNull("nodeId")
                    putString("platform", "wearos")
                }
                promise.resolve(fallback)
            }
        }.start()
    }

    @ReactMethod
    fun pushWorkoutPayload(path: String, payload: String, promise: Promise) {
        Thread {
            try {
                val nodeClient = Wearable.getNodeClient(reactContext)
                val messageClient = Wearable.getMessageClient(reactContext)
                val dataClient = Wearable.getDataClient(reactContext)

                // 1. Send via Data Layer (persisted sync)
                val putDataMapReq = PutDataMapRequest.create(path).apply {
                    dataMap.putString("payload", payload)
                    dataMap.putLong("timestamp", System.currentTimeMillis())
                }
                val putDataReq = putDataMapReq.asPutDataRequest().setUrgent()
                Tasks.await(dataClient.putDataItem(putDataReq))

                // 2. Also send via MessageClient to connected nodes
                val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)
                if (nodes.isNotEmpty()) {
                    val bytes = payload.toByteArray(StandardCharsets.UTF_8)
                    for (node in nodes) {
                        try {
                            Tasks.await(messageClient.sendMessage(node.id, path, bytes))
                        } catch (_: Exception) {
                        }
                    }
                }

                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }.start()
    }

    @ReactMethod
    fun sendMessage(path: String, message: String, promise: Promise) {
        Thread {
            try {
                val nodeClient = Wearable.getNodeClient(reactContext)
                val messageClient = Wearable.getMessageClient(reactContext)
                val nodes: List<Node> = Tasks.await(nodeClient.connectedNodes)

                if (nodes.isEmpty()) {
                    promise.resolve(false)
                    return@Thread
                }

                val bytes = message.toByteArray(StandardCharsets.UTF_8)
                var anySuccess = false
                for (node in nodes) {
                    try {
                        Tasks.await(messageClient.sendMessage(node.id, path, bytes))
                        anySuccess = true
                    } catch (_: Exception) {
                    }
                }
                promise.resolve(anySuccess)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }.start()
    }

    @ReactMethod
    fun addListener(eventName: String) {
    }

    @ReactMethod
    fun removeListeners(count: Int) {
    }

    override fun invalidate() {
        super.invalidate()
        try {
            Wearable.getMessageClient(reactContext).removeListener(this)
        } catch (_: Exception) {
        }
    }
}
`;

const withWatchBridgeFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.platformProjectRoot;
      const watchDir = path.join(
        projectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'gkeliteinfo',
        'gkgymlife',
        'watch'
      );

      fs.mkdirSync(watchDir, { recursive: true });
      fs.writeFileSync(path.join(watchDir, 'WatchBridgePackage.kt'), packageContent, 'utf8');
      fs.writeFileSync(path.join(watchDir, 'WatchBridgeModule.kt'), moduleContent, 'utf8');

      return cfg;
    },
  ]);
};

const withWatchBridgeGradle = (config) => {
  return withAppBuildGradle(config, (gradleConfig) => {
    let contents = gradleConfig.modResults.contents;
    if (!contents.includes('play-services-wearable')) {
      const depString = `
    // Google Play Services Wearable Data Layer API for Smartwatch sync
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.1")
`;
      contents = contents.replace(/dependencies\s*\{/, `dependencies {${depString}`);
      gradleConfig.modResults.contents = contents;
    }
    return gradleConfig;
  });
};

const withWatchBridgeMainApplication = (config) => {
  return withMainApplication(config, (mainAppConfig) => {
    let contents = mainAppConfig.modResults.contents;

    // 1. Ensure import is present
    if (!contents.includes('import com.gkeliteinfo.gkgymlife.watch.WatchBridgePackage')) {
      contents = contents.replace(
        /package com\.gkeliteinfo\.gkgymlife/,
        `package com.gkeliteinfo.gkgymlife\n\nimport com.gkeliteinfo.gkgymlife.watch.WatchBridgePackage`
      );
    }

    // 2. Ensure package is registered
    if (!contents.includes('WatchBridgePackage()')) {
      contents = contents.replace(
        /PackageList\(this\)\.packages\.apply\s*\{/,
        `PackageList(this).packages.apply {\n          add(WatchBridgePackage())`
      );
    }

    mainAppConfig.modResults.contents = contents;
    return mainAppConfig;
  });
};

const withWatchBridge = (config) => {
  config = withWatchBridgeFiles(config);
  config = withWatchBridgeGradle(config);
  config = withWatchBridgeMainApplication(config);
  return config;
};

module.exports = createRunOncePlugin(withWatchBridge, 'withWatchBridge', '1.0.0');
