# 10s-of-fun

## Build Instructions

1. Open the project in Android Studio
2. Build > Build Bundle(s) / APK(s) > Build APK(s)
3. The APK will be generated in `app/build/outputs/apk/debug/`

## Command Line Build

```bash
./gradlew assembleDebug
```

## Features

- Black background on launch
- Fetches JSON from https://example.com/apk-123/fun.json
- Displays random entry from "data" array
- Auto-terminates after 10 seconds
