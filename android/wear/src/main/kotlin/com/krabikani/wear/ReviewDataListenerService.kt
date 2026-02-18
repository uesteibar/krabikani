package com.krabikani.wear

import android.util.Log
import androidx.wear.tiles.TileService
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.WearableListenerService

class ReviewDataListenerService : WearableListenerService() {

    companion object {
        private const val TAG = "ReviewDataListener"
        private const val DATA_PATH = "/krabikani/review-summary"
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.type == DataEvent.TYPE_CHANGED &&
                event.dataItem.uri.path == DATA_PATH
            ) {
                Log.d(TAG, "Review data changed, requesting tile update")
                TileService.getUpdater(this)
                    .requestUpdate(ReviewTileService::class.java)
            }
        }
    }
}
