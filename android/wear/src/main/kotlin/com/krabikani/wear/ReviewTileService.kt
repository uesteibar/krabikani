package com.krabikani.wear

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.concurrent.futures.CallbackToFutureAdapter
import androidx.wear.protolayout.ColorBuilders
import androidx.wear.protolayout.DimensionBuilders
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.protolayout.material.Text
import androidx.wear.protolayout.material.Typography
import androidx.wear.protolayout.material.layouts.PrimaryLayout
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.google.common.util.concurrent.ListenableFuture
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class ReviewTileService : TileService() {

    companion object {
        private const val TAG = "ReviewTileService"
        private const val DATA_PATH = "/krabikani/review-summary"
        private const val RESOURCES_VERSION = "1"
        private const val STALE_THRESHOLD_MS = 3_600_000L // 1 hour
        private const val BRAND_PURPLE = 0xFFAA00FF.toInt()
    }

    override fun onTileRequest(
        requestParams: RequestBuilders.TileRequest
    ): ListenableFuture<TileBuilders.Tile> {
        val reviewData = readReviewData()
        val layout = if (reviewData != null) {
            buildDataLayout(this, requestParams.deviceConfiguration, reviewData)
        } else {
            buildNoDataLayout(this, requestParams.deviceConfiguration)
        }

        val tile = TileBuilders.Tile.Builder()
            .setResourcesVersion(RESOURCES_VERSION)
            .setTileTimeline(
                TimelineBuilders.Timeline.fromLayoutElement(layout)
            )
            .build()

        return CallbackToFutureAdapter.getFuture { completer ->
            completer.set(tile)
            "onTileRequest"
        }
    }

    override fun onTileResourcesRequest(
        requestParams: RequestBuilders.ResourcesRequest
    ): ListenableFuture<ResourceBuilders.Resources> {
        val resources = ResourceBuilders.Resources.Builder()
            .setVersion(RESOURCES_VERSION)
            .build()

        return CallbackToFutureAdapter.getFuture { completer ->
            completer.set(resources)
            "onTileResourcesRequest"
        }
    }

    private data class ReviewData(
        val availableReviews: Int,
        val nextReviewTime: String,
        val lastUpdated: Long
    )

    private fun readReviewData(): ReviewData? {
        return try {
            val dataClient = Wearable.getDataClient(this)
            val dataItems = Tasks.await(
                dataClient.getDataItems(
                    Uri.parse("wear://*$DATA_PATH")
                ),
                5, TimeUnit.SECONDS
            )

            try {
                if (dataItems.count > 0) {
                    val dataMap = DataMapItem.fromDataItem(dataItems[0]).dataMap
                    ReviewData(
                        availableReviews = dataMap.getInt("available_reviews"),
                        nextReviewTime = dataMap.getString("next_review_time") ?: "",
                        lastUpdated = dataMap.getLong("last_updated")
                    )
                } else {
                    null
                }
            } finally {
                dataItems.release()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read review data", e)
            null
        }
    }

    private fun buildDataLayout(
        context: Context,
        deviceConfig: androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters,
        data: ReviewData
    ): LayoutElementBuilders.LayoutElement {
        val isStale = System.currentTimeMillis() - data.lastUpdated > STALE_THRESHOLD_MS
        val updatedText = formatTimestamp(data.lastUpdated)
        val nextReview = if (data.nextReviewTime.isNotEmpty()) {
            "Next: ${data.nextReviewTime}"
        } else {
            ""
        }

        val columnBuilder = LayoutElementBuilders.Column.Builder()
            .setWidth(DimensionBuilders.expand())
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .addContent(
                Text.Builder(context, data.availableReviews.toString())
                    .setTypography(Typography.TYPOGRAPHY_DISPLAY1)
                    .setColor(ColorBuilders.argb(BRAND_PURPLE))
                    .build()
            )
            .addContent(
                Text.Builder(context, "pending reviews")
                    .setTypography(Typography.TYPOGRAPHY_CAPTION1)
                    .build()
            )
            .addContent(
                Text.Builder(context, updatedText)
                    .setTypography(Typography.TYPOGRAPHY_CAPTION2)
                    .build()
            )

        if (nextReview.isNotEmpty()) {
            columnBuilder.addContent(
                Text.Builder(context, nextReview)
                    .setTypography(Typography.TYPOGRAPHY_CAPTION2)
                    .build()
            )
        }

        if (isStale) {
            columnBuilder.addContent(
                Text.Builder(context, "\u26A0 STALE")
                    .setTypography(Typography.TYPOGRAPHY_CAPTION2)
                    .setColor(ColorBuilders.argb(0xFFFFAB00.toInt()))
                    .build()
            )
        }

        return PrimaryLayout.Builder(deviceConfig)
            .setResponsiveContentInsetEnabled(true)
            .setContent(columnBuilder.build())
            .build()
    }

    private fun buildNoDataLayout(
        context: Context,
        deviceConfig: androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters
    ): LayoutElementBuilders.LayoutElement {
        return PrimaryLayout.Builder(deviceConfig)
            .setResponsiveContentInsetEnabled(true)
            .setContent(
                Text.Builder(context, "No data \u2014 open Krabikani on your phone")
                    .setTypography(Typography.TYPOGRAPHY_CAPTION1)
                    .setMaxLines(3)
                    .build()
            )
            .build()
    }

    private fun formatTimestamp(millis: Long): String {
        val formatter = SimpleDateFormat("HH:mm", Locale.getDefault())
        return "Updated ${formatter.format(Date(millis))}"
    }
}
