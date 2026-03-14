"""Convert one MP4 into two GIFs, split at a given second."""
import cv2
from PIL import Image
import sys

VIDEO   = r"C:\Users\NChaduneli\Desktop\Task Organizer\Untitled Project1967bef.autosave.mp4"
OUT_A   = r"C:\Users\NChaduneli\Desktop\Task Organizer\docs\ui\gif-04-mcp-task-lifecycle.gif"
OUT_B   = r"C:\Users\NChaduneli\Desktop\Task Organizer\docs\ui\gif-05-mcp-create-task.gif"

SPLIT_SEC    = 8.0
GIF_FPS      = 8
TARGET_WIDTH = 800    # px; height scales proportionally

cap      = cv2.VideoCapture(VIDEO)
orig_fps = cap.get(cv2.CAP_PROP_FPS)
total    = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
W        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
H        = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
duration = total / orig_fps

new_w = TARGET_WIDTH
new_h = int(H * TARGET_WIDTH / W)
split_frame  = int(SPLIT_SEC * orig_fps)
sample_every = max(1, round(orig_fps / GIF_FPS))
frame_dur_ms = int(1000 / GIF_FPS)

print(f"Source: {W}x{H} @ {orig_fps}fps  {duration:.1f}s  ({total} frames)")
print(f"Output: {new_w}x{new_h}  {GIF_FPS}fps  split at frame {split_frame}")

frames_a, frames_b = [], []

idx = 0
while True:
    ok, bgr = cap.read()
    if not ok:
        break
    if idx % sample_every == 0:
        rgb  = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        rgb  = cv2.resize(rgb, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        img  = Image.fromarray(rgb).quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        if idx < split_frame:
            frames_a.append(img)
        else:
            frames_b.append(img)
    idx += 1

cap.release()

def save_gif(frames, path, label):
    if not frames:
        print(f"No frames for {label}"); return
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        loop=0,
        duration=frame_dur_ms,
        optimize=True,
    )
    size_mb = __import__("os").path.getsize(path) / 1e6
    print(f"Saved {label}: {len(frames)} frames -> {path}  ({size_mb:.1f} MB)")

save_gif(frames_a, OUT_A, "A (task lifecycle)")
save_gif(frames_b, OUT_B, "B (create task)")
