#!/bin/bash
# Assemble demo screenshots into a short MP4 using ffmpeg
# Usage: run from the project root after saving screenshots as demo-001.png, demo-002.png, ...

mkdir -p frontend/demo
ffmpeg -y -framerate 1 -i frontend/demo/demo-%03d.png -c:v libx264 -r 30 -pix_fmt yuv420p frontend/demo/tastemate-demo.mp4

echo "Created frontend/demo/tastemate-demo.mp4"
