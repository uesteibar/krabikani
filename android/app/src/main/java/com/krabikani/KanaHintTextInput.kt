package com.krabikani

import android.content.Context
import android.os.Build
import android.os.LocaleList
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.textinput.ReactEditText
import com.facebook.react.views.textinput.ReactTextInputManager

private class KanaHintEditText(context: Context) : ReactEditText(context) {
  var hintJapaneseKeyboard: Boolean = false

  override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
    val connection = super.onCreateInputConnection(outAttrs)
    if (hintJapaneseKeyboard && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      outAttrs.hintLocales = LocaleList.forLanguageTags("ja-JP")
    }
    return connection
  }
}

class KanaHintTextInputManager : ReactTextInputManager() {
  override fun getName(): String = "KanaHintTextInput"

  override fun createViewInstance(context: ThemedReactContext): ReactEditText {
    return KanaHintEditText(context)
  }

  @ReactProp(name = "hintJapaneseKeyboard", defaultBoolean = false)
  fun setHintJapaneseKeyboard(view: ReactEditText, enabled: Boolean) {
    (view as? KanaHintEditText)?.hintJapaneseKeyboard = enabled
  }
}
