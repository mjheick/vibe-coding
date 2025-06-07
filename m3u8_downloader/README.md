# m3u8_downloader

This Python program provides a complete solution for downloading M3U8 playlists and merging them into a single video file. Here's what it does:

Key Features:
- Downloads M3U8 playlists from any URL
- Parses the playlist to extract video segment URLs
- Downloads segments concurrently for faster processing
- Concatenates segments using FFmpeg (preferred) or manual binary concatenation
- Handles relative URLs in playlists
- Progress tracking during download
- Error handling for network issues and missing segments

Usage:

Basic usage

```python m3u8_downloader.py "https://example.com/playlist.m3u8"```

Specify output file

```python m3u8_downloader.py "https://example.com/playlist.m3u8" -o "my_video.mp4"```

Use more concurrent downloads

```python m3u8_downloader.py "https://example.com/playlist.m3u8" -w 10```

Requirements:

You'll need to install the requests library:

```pip install requests```

For best results, install FFmpeg on your system:
- Windows: Download from https://ffmpeg.org/
- Mac: ```brew install ffmpeg```
- Linux: ```sudo apt install ffmpeg``` or ```sudo yum install ffmpeg```

# Testing

Using [https://docs.flowplayer.com/tools/stream-tester](flowplayer stream-tester) the script properly downloaded and "parsed" the file correctly.

Source: [https://cdn.flowplayer.com/a30bd6bc-f98b-47bc-abf5-97633d4faea0/hls/de3f6ca7-2db3-4689-8160-0f574a5996ad/playlist.m3u8]

Unfortunately the file contains m3u8 files of different resolutions.

```
#EXTM3U
#EXT-X-VERSION:4
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-STREAM-INF:BANDWIDTH=2540826,AVERAGE-BANDWIDTH=1199258,CODECS="avc1.64001f,mp4a.40.2",RESOLUTION=1280x720,FRAME-RATE=24.000,AUDIO="aac-1",CLOSED-CAPTIONS=NONE
playlist_720.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1365701,AVERAGE-BANDWIDTH=728833,CODECS="avc1.42c01e,mp4a.40.2",RESOLUTION=640x360,FRAME-RATE=24.000,AUDIO="aac-1",CLOSED-CAPTIONS=NONE
playlist_360.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=807717,AVERAGE-BANDWIDTH=517379,CODECS="avc1.42c015,mp4a.40.2",RESOLUTION=480x270,FRAME-RATE=24.000,AUDIO="aac-1",CLOSED-CAPTIONS=NONE
playlist_270.m3u8
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac-1",LANGUAGE="und",NAME="Alternate Audio",AUTOSELECT=YES,DEFAULT=YES,URI="playlist_audio_en_1.m3u8"
```

Modifying the download URL to ```playlist_720.m3u8``` netted a correctly downloaded and concatenated video, with no audio.

Looking at the original file it seems the audio is carried separately as ```playlist_audio_en_1.m3u8```, and providing this playlist as a parameter does provide a separate audio file.

Improvements to this script revolve around detecting playlists within playlists and singular audio streams to additionally parse within the final product.

In the meantime combining video/audio with ffmpeg is as easy as: ```ffmpeg -i video.mp4 -i audio.mp4 -c:v copy -c:a copy final.mp4```
