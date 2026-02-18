package com.krabikani.wear

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable

class WearDataModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "WearDataModule"
        private const val DATA_PATH = "/krabikani/review-summary"
    }

    override fun getName(): String = "WearDataModule"

    @ReactMethod
    fun sendReviewData(reviewCount: Int, nextReviewISO: String?, reviewsDoneToday: Int, promise: Promise) {
        try {
            val putDataMapRequest = PutDataMapRequest.create(DATA_PATH)
            putDataMapRequest.dataMap.apply {
                putInt("available_reviews", reviewCount)
                putInt("reviews_done_today", reviewsDoneToday)
                putString("next_review_time", nextReviewISO ?: "")
                putLong("last_updated", System.currentTimeMillis())
            }

            val putDataRequest = putDataMapRequest.asPutDataRequest().setUrgent()

            Wearable.getDataClient(reactApplicationContext)
                .putDataItem(putDataRequest)
                .addOnSuccessListener {
                    Log.d(TAG, "Review data sent: count=$reviewCount")
                    promise.resolve(null)
                }
                .addOnFailureListener { e ->
                    if (e is ApiException) {
                        Log.w(TAG, "ApiException sending review data: ${e.statusCode}", e)
                    } else {
                        Log.w(TAG, "Failed to send review data", e)
                    }
                    promise.resolve(null)
                }
        } catch (e: ApiException) {
            Log.w(TAG, "ApiException creating data request: ${e.statusCode}", e)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.w(TAG, "Unexpected error sending review data", e)
            promise.resolve(null)
        }
    }
}
