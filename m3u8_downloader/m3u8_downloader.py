#!/usr/bin/env python3
"""
M3U8 Video Downloader
Downloads M3U8 playlists and concatenates video segments into a single file.
"""

import argparse
import os
import sys
import tempfile
import shutil
from urllib.parse import urljoin, urlparse
from pathlib import Path
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import subprocess
import re


class M3U8Downloader:
    def __init__(self, playlist_url, output_file="output.mp4", max_workers=5):
        self.playlist_url = playlist_url
        self.output_file = output_file
        self.max_workers = max_workers
        self.base_url = self._get_base_url(playlist_url)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def _get_base_url(self, url):
        """Extract base URL for resolving relative paths"""
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}{'/'.join(parsed.path.split('/')[:-1])}/"
    
    def download_playlist(self):
        """Download the M3U8 playlist content"""
        try:
            response = self.session.get(self.playlist_url, timeout=30)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            print(f"Error downloading playlist: {e}")
            return None
    
    def parse_playlist(self, content):
        """Parse M3U8 content and extract video segment URLs"""
        segments = []
        lines = content.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                # Handle relative URLs
                if line.startswith('http'):
                    segment_url = line
                else:
                    segment_url = urljoin(self.base_url, line)
                segments.append(segment_url)
        
        return segments
    
    def download_segment(self, segment_info):
        """Download a single video segment"""
        segment_url, temp_dir, index = segment_info
        try:
            response = self.session.get(segment_url, timeout=30)
            response.raise_for_status()
            
            # Save segment with zero-padded index for proper ordering
            segment_path = os.path.join(temp_dir, f"segment_{index:06d}.ts")
            with open(segment_path, 'wb') as f:
                f.write(response.content)
            
            return segment_path, True
        except requests.RequestException as e:
            print(f"Error downloading segment {index}: {e}")
            return None, False
    
    def download_segments(self, segments):
        """Download all video segments concurrently"""
        temp_dir = tempfile.mkdtemp(prefix="m3u8_download_")
        print(f"Downloading {len(segments)} segments...")
        
        downloaded_segments = []
        segment_info = [(url, temp_dir, i) for i, url in enumerate(segments)]
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_segment = {
                executor.submit(self.download_segment, info): info 
                for info in segment_info
            }
            
            for i, future in enumerate(as_completed(future_to_segment)):
                segment_path, success = future.result()
                if success:
                    downloaded_segments.append(segment_path)
                
                # Progress indicator
                print(f"Progress: {i+1}/{len(segments)} segments", end='\r')
        
        print(f"\nDownloaded {len(downloaded_segments)} segments successfully")
        return sorted(downloaded_segments), temp_dir
    
    def concatenate_segments_ffmpeg(self, segments, temp_dir):
        """Concatenate segments using FFmpeg"""
        # Create file list for FFmpeg
        filelist_path = os.path.join(temp_dir, "filelist.txt")
        with open(filelist_path, 'w') as f:
            for segment in segments:
                f.write(f"file '{segment}'\n")
        
        # Run FFmpeg to concatenate
        cmd = [
            'ffmpeg', '-f', 'concat', '-safe', '0',
            '-i', filelist_path,
            '-c', 'copy',
            '-y',  # Overwrite output file
            self.output_file
        ]
        
        try:
            print("Concatenating segments with FFmpeg...")
            subprocess.run(cmd, check=True, capture_output=True)
            print(f"Video saved as: {self.output_file}")
            return True
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error: {e}")
            return False
        except FileNotFoundError:
            print("FFmpeg not found. Please install FFmpeg to concatenate segments.")
            return False
    
    def concatenate_segments_manual(self, segments, temp_dir):
        """Manually concatenate segments by joining binary data"""
        print("Concatenating segments manually...")
        try:
            with open(self.output_file, 'wb') as output:
                for i, segment_path in enumerate(segments):
                    with open(segment_path, 'rb') as segment:
                        output.write(segment.read())
                    print(f"Merged segment {i+1}/{len(segments)}", end='\r')
            
            print(f"\nVideo saved as: {self.output_file}")
            return True
        except Exception as e:
            print(f"Error concatenating segments: {e}")
            return False
    
    def download_and_merge(self):
        """Main method to download playlist and merge segments"""
        print(f"Downloading M3U8 playlist: {self.playlist_url}")
        
        # Download playlist
        playlist_content = self.download_playlist()
        if not playlist_content:
            return False
        
        # Parse segments
        segments = self.parse_playlist(playlist_content)
        if not segments:
            print("No video segments found in playlist")
            return False
        
        print(f"Found {len(segments)} video segments")
        
        # Download segments
        downloaded_segments, temp_dir = self.download_segments(segments)
        if not downloaded_segments:
            print("No segments downloaded successfully")
            return False
        
        try:
            # Try FFmpeg first, fall back to manual concatenation
            if not self.concatenate_segments_ffmpeg(downloaded_segments, temp_dir):
                self.concatenate_segments_manual(downloaded_segments, temp_dir)
            
            return True
        finally:
            # Clean up temporary directory
            shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description="Download and merge M3U8 video streams")
    parser.add_argument("url", help="M3U8 playlist URL")
    parser.add_argument("-o", "--output", default="output.mp4", 
                       help="Output video file (default: output.mp4)")
    parser.add_argument("-w", "--workers", type=int, default=5,
                       help="Number of concurrent downloads (default: 5)")
    
    args = parser.parse_args()
    
    # Validate output file extension
    if not args.output.endswith(('.mp4', '.mkv', '.avi', '.ts')):
        print("Warning: Output file should have a video extension (.mp4, .mkv, .avi, .ts)")
    
    # Create downloader and process
    downloader = M3U8Downloader(args.url, args.output, args.workers)
    success = downloader.download_and_merge()
    
    if success:
        print("Video download and merge completed successfully!")
        sys.exit(0)
    else:
        print("Failed to download and merge video")
        sys.exit(1)


if __name__ == "__main__":
    main()
