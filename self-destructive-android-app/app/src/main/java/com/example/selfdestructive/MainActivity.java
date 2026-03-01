package com.example.selfdestructive;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.widget.TextView;
import android.widget.RelativeLayout;

import com.google.gson.Gson;
import com.google.gson.annotations.SerializedName;

import java.io.IOException;
import java.util.List;
import java.util.Random;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class MainActivity extends Activity {

    private TextView textView;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        RelativeLayout layout = new RelativeLayout(this);
        layout.setBackgroundColor(Color.BLACK);

        textView = new TextView(this);
        textView.setTextColor(Color.WHITE);
        textView.setTextSize(24);
        textView.setGravity(Gravity.CENTER);

        RelativeLayout.LayoutParams params = new RelativeLayout.LayoutParams(
                RelativeLayout.LayoutParams.WRAP_CONTENT,
                RelativeLayout.LayoutParams.WRAP_CONTENT
        );
        params.addRule(RelativeLayout.CENTER_IN_PARENT);
        textView.setLayoutParams(params);

        layout.addView(textView);
        setContentView(layout);

        fetchData();
    }

    private void fetchData() {
        OkHttpClient client = new OkHttpClient();
        Request request = new Request.Builder()
                .url("https://example.com/apk-123/fun.json")
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                handler.post(() -> loadDefaultData());
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful() && response.body() != null) {
                    String json = response.body().string();
                    displayRandomData(json);
                } else {
                    handler.post(() -> loadDefaultData());
                }
            }
        });
    }

    private void loadDefaultData() {
        try {
            String json = new String(getAssets().open("default-fun.json").readAllBytes());
            displayRandomData(json);
        } catch (IOException e) {
            textView.setText("Error loading data");
            scheduleTermination();
        }
    }

    private void displayRandomData(String json) {
        Gson gson = new Gson();
        DataResponse dataResponse = gson.fromJson(json, DataResponse.class);

        if (dataResponse != null && dataResponse.data != null && !dataResponse.data.isEmpty()) {
            String randomValue = dataResponse.data.get(new Random().nextInt(dataResponse.data.size()));
            handler.post(() -> {
                textView.setText(randomValue);
                scheduleTermination();
            });
        }
    }

    private void scheduleTermination() {
        handler.postDelayed(() -> finishAndRemoveTask(), 10000);
    }

    static class DataResponse {
        @SerializedName("data")
        List<String> data;
    }
}
