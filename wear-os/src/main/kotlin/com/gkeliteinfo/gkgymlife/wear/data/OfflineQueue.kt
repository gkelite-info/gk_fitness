package com.gkeliteinfo.gkgymlife.wear.data

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class OfflineQueue(context: Context) {
    private val prefs = context.getSharedPreferences("gk_wear_offline_queue", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val listType = object : TypeToken<MutableList<PendingSetLog>>() {}.type

    @Synchronized
    fun insert(setLog: PendingSetLog): Long {
        val list = getAllLogs()
        list.add(setLog)
        saveLogs(list)
        return setLog.id
    }

    @Synchronized
    fun getUnsyncedLogs(): List<PendingSetLog> {
        return getAllLogs().filter { !it.synced }
    }

    @Synchronized
    fun markSynced(ids: List<Long>) {
        val list = getAllLogs()
        for (item in list) {
            if (ids.contains(item.id)) {
                item.synced = true
            }
        }
        saveLogs(list)
    }

    @Synchronized
    fun clearSynced() {
        val list = getAllLogs().filter { !it.synced }.toMutableList()
        saveLogs(list)
    }

    private fun getAllLogs(): MutableList<PendingSetLog> {
        val raw = prefs.getString("pending_logs", null) ?: return mutableListOf()
        return try {
            gson.fromJson(raw, listType) ?: mutableListOf()
        } catch (_: Exception) {
            mutableListOf()
        }
    }

    private fun saveLogs(list: List<PendingSetLog>) {
        prefs.edit().putString("pending_logs", gson.toJson(list)).apply()
    }
}
