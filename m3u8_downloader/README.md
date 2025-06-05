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

   python m3u8_downloader.py "https://example.com/playlist.m3u8"

Specify output file

   python m3u8_downloader.py "https://example.com/playlist.m3u8" -o "my_video.mp4"

Use more concurrent downloads

   python m3u8_downloader.py "https://example.com/playlist.m3u8" -w 10

Requirements:

You'll need to install the requests library:

   bashpip install requests

For best results, install FFmpeg on your system:

Windows: Download from https://ffmpeg.org/

Mac: brew install ffmpeg

Linux: sudo apt install ffmpeg or sudo yum install ffmpeg
