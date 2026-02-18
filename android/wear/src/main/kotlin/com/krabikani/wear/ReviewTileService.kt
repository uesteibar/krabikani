package com.krabikani.wear

import android.content.Context
import android.net.Uri
import android.util.Log
import com.krabikani.R
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
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.google.common.util.concurrent.ListenableFuture

class ReviewTileService : TileService() {

    companion object {
        private const val TAG = "ReviewTileService"
        private const val DATA_PATH = "/krabikani/review-summary"
        private const val RESOURCES_VERSION = "2"
        private const val BRAND_PURPLE = 0xFFAA00FF.toInt()
        private const val SUBTLE_WHITE = 0xB3FFFFFF.toInt() // 70% white
        private const val DIM_WHITE = 0x80FFFFFF.toInt() // 50% white
        private const val APP_ICON_ID = "app_icon"
        private const val APP_ICON_SIZE_DP = 24
        private const val APP_ICON_LARGE_SIZE_DP = 48
    }

    override fun onTileRequest(
        requestParams: RequestBuilders.TileRequest
    ): ListenableFuture<TileBuilders.Tile> {
        return CallbackToFutureAdapter.getFuture { completer ->
            val dataClient = Wearable.getDataClient(this)
            dataClient.getDataItems(Uri.parse("wear://*$DATA_PATH"))
                .addOnSuccessListener { dataItems ->
                    try {
                        val reviewData = if (dataItems.count > 0) {
                            val dataMap = DataMapItem.fromDataItem(dataItems[0]).dataMap
                            ReviewData(
                                availableReviews = dataMap.getInt("available_reviews"),
                                reviewsDoneToday = dataMap.getInt("reviews_done_today", 0)
                            )
                        } else {
                            null
                        }
                        dataItems.release()

                        val layout = if (reviewData != null) {
                            buildDataLayout(this, requestParams.deviceConfiguration, reviewData)
                        } else {
                            buildNoDataLayout(this, requestParams.deviceConfiguration)
                        }

                        completer.set(
                            TileBuilders.Tile.Builder()
                                .setResourcesVersion(RESOURCES_VERSION)
                                .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout))
                                .build()
                        )
                    } catch (e: Exception) {
                        Log.w(TAG, "Error building tile layout", e)
                        completer.set(buildFallbackTile(requestParams.deviceConfiguration))
                    }
                }
                .addOnFailureListener { e ->
                    Log.w(TAG, "Failed to read review data", e)
                    completer.set(buildFallbackTile(requestParams.deviceConfiguration))
                }
            "onTileRequest"
        }
    }

    override fun onTileResourcesRequest(
        requestParams: RequestBuilders.ResourcesRequest
    ): ListenableFuture<ResourceBuilders.Resources> {
        val resources = ResourceBuilders.Resources.Builder()
            .setVersion(RESOURCES_VERSION)
            .addIdToImageMapping(
                APP_ICON_ID,
                ResourceBuilders.ImageResource.Builder()
                    .setAndroidResourceByResId(
                        ResourceBuilders.AndroidImageResourceByResId.Builder()
                            .setResourceId(R.drawable.ic_app_icon)
                            .build()
                    )
                    .build()
            )
            .build()

        return CallbackToFutureAdapter.getFuture { completer ->
            completer.set(resources)
            "onTileResourcesRequest"
        }
    }

    private data class ReviewData(
        val availableReviews: Int,
        val reviewsDoneToday: Int
    )

    private fun buildFallbackTile(
        deviceConfig: androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters
    ): TileBuilders.Tile {
        return TileBuilders.Tile.Builder()
            .setResourcesVersion(RESOURCES_VERSION)
            .setTileTimeline(
                TimelineBuilders.Timeline.fromLayoutElement(
                    buildNoDataLayout(this, deviceConfig)
                )
            )
            .build()
    }

    private fun buildDataLayout(
        context: Context,
        deviceConfig: androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters,
        data: ReviewData
    ): LayoutElementBuilders.LayoutElement {
        val todayText = if (data.reviewsDoneToday > 0) {
            "${data.reviewsDoneToday} done today"
        } else {
            "Start your first review!"
        }

        val content = LayoutElementBuilders.Column.Builder()
            .setWidth(DimensionBuilders.expand())
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .addContent(appIcon(APP_ICON_SIZE_DP))
            .addContent(spacer(4))
            .addContent(
                Text.Builder(context, data.availableReviews.toString())
                    .setTypography(Typography.TYPOGRAPHY_DISPLAY1)
                    .setColor(ColorBuilders.argb(BRAND_PURPLE))
                    .build()
            )
            .addContent(
                Text.Builder(context, "reviews available")
                    .setTypography(Typography.TYPOGRAPHY_BODY2)
                    .setColor(ColorBuilders.argb(SUBTLE_WHITE))
                    .build()
            )
            .addContent(spacer(12))
            .addContent(
                Text.Builder(context, todayText)
                    .setTypography(Typography.TYPOGRAPHY_CAPTION1)
                    .setColor(ColorBuilders.argb(DIM_WHITE))
                    .build()
            )
            .build()

        return PrimaryLayout.Builder(deviceConfig)
            .setResponsiveContentInsetEnabled(true)
            .setContent(content)
            .build()
    }

    private fun buildNoDataLayout(
        context: Context,
        deviceConfig: androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters
    ): LayoutElementBuilders.LayoutElement {
        return PrimaryLayout.Builder(deviceConfig)
            .setResponsiveContentInsetEnabled(true)
            .setContent(
                LayoutElementBuilders.Column.Builder()
                    .setWidth(DimensionBuilders.expand())
                    .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
                    .addContent(appIcon(APP_ICON_LARGE_SIZE_DP))
                    .addContent(spacer(8))
                    .addContent(
                        Text.Builder(context, "Open Krabikani\non your phone")
                            .setTypography(Typography.TYPOGRAPHY_CAPTION1)
                            .setColor(ColorBuilders.argb(SUBTLE_WHITE))
                            .setMaxLines(2)
                            .build()
                    )
                    .build()
            )
            .build()
    }

    private fun appIcon(sizeDp: Int): LayoutElementBuilders.LayoutElement {
        return LayoutElementBuilders.Image.Builder()
            .setResourceId(APP_ICON_ID)
            .setWidth(DimensionBuilders.dp(sizeDp.toFloat()))
            .setHeight(DimensionBuilders.dp(sizeDp.toFloat()))
            .build()
    }

    private fun spacer(heightDp: Int): LayoutElementBuilders.LayoutElement {
        return LayoutElementBuilders.Spacer.Builder()
            .setHeight(DimensionBuilders.dp(heightDp.toFloat()))
            .build()
    }

}
