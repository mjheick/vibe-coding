const ASCII_CHARS = " .,:;i1tfLCG08@";
const WIDTH = 160;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const asciiEl = document.getElementById("ascii");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");

let animationId = null;
let paused = false;

startBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.addEventListener("loadeddata", () => {
      const aspect = video.videoHeight / video.videoWidth;
      // Characters are ~2x taller than wide, so halve the height
      const height = Math.floor(WIDTH * aspect * 0.5);
      canvas.width = WIDTH;
      canvas.height = height;
      startBtn.style.display = "none";
      pauseBtn.style.display = "inline-block";
      render(height);
    });
  } catch (err) {
    asciiEl.textContent = "Camera access denied or unavailable.";
  }
});

function render(height) {
  ctx.drawImage(video, 0, 0, WIDTH, height);
  const imageData = ctx.getImageData(0, 0, WIDTH, height);
  const pixels = imageData.data;

  let ascii = "";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const charIndex = Math.floor(brightness * (ASCII_CHARS.length - 1));
      ascii += ASCII_CHARS[charIndex];
    }
    ascii += "\n";
  }

  asciiEl.textContent = ascii;
  if (!paused) {
    animationId = requestAnimationFrame(() => render(height));
  }
}

pauseBtn.addEventListener("click", () => {
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  if (!paused) {
    const height = canvas.height;
    render(height);
  } else {
    cancelAnimationFrame(animationId);
  }
});
