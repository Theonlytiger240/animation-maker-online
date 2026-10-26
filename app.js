const stage = document.getElementById('stage');
const ctx = stage.getContext('2d');
const timelineEl = document.getElementById('timeline');
const frameLabel = document.getElementById('frame-label');
const fpsLabel = document.getElementById('fps-label');
const frameCountBadge = document.getElementById('frame-count-badge');
const brushSizeInput = document.getElementById('brush-size');
const brushSizeValue = document.getElementById('brush-size-value');
const colorPicker = document.getElementById('color-picker');
const opacityRange = document.getElementById('opacity-range');
const opacityValue = document.getElementById('opacity-value');
const onionSkinToggle = document.getElementById('onion-skin');
const fpsRange = document.getElementById('fps-range');
const fpsValue = document.getElementById('fps-value');
const playBtn = document.getElementById('play-btn');
const exportBtn = document.getElementById('export-btn');
const newSceneBtn = document.getElementById('new-scene');
const addFrameBtn = document.getElementById('add-frame');
const duplicateFrameBtn = document.getElementById('duplicate-frame');
const deleteFrameBtn = document.getElementById('delete-frame');
const undoBtn = document.getElementById('undo-btn');
const clearBtn = document.getElementById('clear-btn');

const stageWidth = stage.width;
const stageHeight = stage.height;

const state = {
  tool: 'pen',
  currentFrameIndex: 0,
  fps: 12,
  playing: false,
  isDrawing: false,
  lastPoint: null,
  onionSkin: true,
  frames: [],
  animationTimer: null,
};

function createBlankFrameDataUrl() {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = stageWidth;
  tempCanvas.height = stageHeight;
  tempCtx.fillStyle = '#ffffff';
  tempCtx.fillRect(0, 0, stageWidth, stageHeight);
  return tempCanvas.toDataURL('image/png');
}

function getCurrentFrame() {
  return state.frames[state.currentFrameIndex];
}

function makeFrame(dataUrl = createBlankFrameDataUrl()) {
  return {
    id: crypto.randomUUID(),
    dataUrl,
    history: [dataUrl],
    historyIndex: 0,
  };
}

function setupInitialFrames() {
  state.frames = [makeFrame()];
}

function setTool(toolName) {
  state.tool = toolName;
  document.querySelectorAll('.tool-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === toolName);
  });
}

function updateFpsMeta() {
  state.fps = Number(fpsRange.value);
  fpsLabel.textContent = `${state.fps} fps`;
  fpsValue.textContent = `${state.fps} fps`;

  if (state.playing) {
    stopPlayback();
    playAnimation();
  }
}

function renderFrameLabel() {
  const frameIndex = state.currentFrameIndex + 1;
  frameLabel.textContent = `Frame ${frameIndex}`;
  frameCountBadge.textContent = `${state.frames.length} frame${state.frames.length === 1 ? '' : 's'}`;
}

function renderStage() {
  if (!state.frames.length) return;

  const frame = getCurrentFrame();
  drawImageToCanvas(frame.dataUrl);

  if (state.onionSkin && !state.isDrawing && !state.playing) {
    const previousFrame = state.frames[state.currentFrameIndex - 1];
    if (previousFrame) {
      drawPreviewFrame(previousFrame.dataUrl, 0.18);
    }
  }

  renderFrameLabel();
}

function drawImageToCanvas(dataUrl) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, stageWidth, stageHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, stageWidth, stageHeight);
    ctx.drawImage(img, 0, 0, stageWidth, stageHeight);
  };
  img.src = dataUrl;
}

function drawPreviewFrame(dataUrl, alpha) {
  const img = new Image();
  img.onload = () => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = 'grayscale(0.2) sepia(0.2)';
    ctx.drawImage(img, 0, 0, stageWidth, stageHeight);
    ctx.restore();
  };
  img.src = dataUrl;
}

function snapshotCurrentFrame() {
  const frame = getCurrentFrame();
  const dataUrl = stage.toDataURL('image/png');

  if (frame.dataUrl !== dataUrl) {
    frame.dataUrl = dataUrl;
    const history = frame.history;
    const previous = history[history.length - 1];

    if (previous !== dataUrl) {
      history.push(dataUrl);
      if (history.length > 25) {
        history.shift();
      }
      frame.historyIndex = history.length - 1;
    }
  }

  renderTimeline();
}

function undoFrame() {
  const frame = getCurrentFrame();
  if (frame.history.length <= 1) return;

  frame.historyIndex = Math.max(0, frame.historyIndex - 1);
  frame.dataUrl = frame.history[frame.historyIndex];
  drawImageToCanvas(frame.dataUrl);
  renderTimeline();
}

function clearFrame() {
  const blank = createBlankFrameDataUrl();
  const frame = getCurrentFrame();
  frame.dataUrl = blank;
  frame.history.push(blank);
  if (frame.history.length > 25) frame.history.shift();
  frame.historyIndex = frame.history.length - 1;
  drawImageToCanvas(blank);
  renderTimeline();
}

function renderTimeline() {
  timelineEl.innerHTML = '';

  state.frames.forEach((frame, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `frame-card${index === state.currentFrameIndex ? ' selected' : ''}`;

    const indexBadge = document.createElement('span');
    indexBadge.className = 'frame-index';
    indexBadge.textContent = `F${index + 1}`;

    const preview = document.createElement('img');
    preview.src = frame.dataUrl;
    preview.alt = `Frame ${index + 1}`;

    button.appendChild(indexBadge);
    button.appendChild(preview);

    button.addEventListener('click', () => {
      state.currentFrameIndex = index;
      if (state.playing) stopPlayback();
      renderStage();
      renderTimeline();
    });

    timelineEl.appendChild(button);
  });

  renderFrameLabel();
}

function addBlankFrame() {
  const newFrame = makeFrame();
  state.frames.splice(state.currentFrameIndex + 1, 0, newFrame);
  state.currentFrameIndex += 1;
  renderStage();
  renderTimeline();
}

function duplicateFrame() {
  const original = getCurrentFrame();
  const duplicate = makeFrame(original.dataUrl);
  duplicate.history = [...original.history];
  duplicate.historyIndex = original.historyIndex;
  state.frames.splice(state.currentFrameIndex + 1, 0, duplicate);
  state.currentFrameIndex += 1;
  renderStage();
  renderTimeline();
}

function deleteFrame() {
  if (state.frames.length <= 1) return;

  state.frames.splice(state.currentFrameIndex, 1);
  state.currentFrameIndex = Math.min(state.currentFrameIndex, state.frames.length - 1);
  renderStage();
  renderTimeline();
}

function newScene() {
  stopPlayback();
  state.frames = [makeFrame()];
  state.currentFrameIndex = 0;
  renderStage();
  renderTimeline();
}

function updateBrushMeta() {
  brushSizeValue.textContent = `${brushSizeInput.value} px`;
}

function updateOpacityMeta() {
  opacityValue.textContent = `${opacityRange.value}%`;
}

function getMousePosition(event) {
  const rect = stage.getBoundingClientRect();
  const scaleX = stageWidth / rect.width;
  const scaleY = stageHeight / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function drawStroke(start, end) {
  const size = Number(brushSizeInput.value);
  const opacity = Number(opacityRange.value) / 100;
  const isEraser = state.tool === 'eraser';

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size;
  ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : colorPicker.value;
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function startDrawing(event) {
  if (state.playing) return;

  if (state.onionSkin) {
    state.onionSkin = false;
    renderStage();
  }

  const point = getMousePosition(event);
  state.isDrawing = true;
  state.lastPoint = point;

  if (state.tool === 'fill') {
    fillArea(point, colorPicker.value);
    snapshotCurrentFrame();
    state.isDrawing = false;

    if (onionSkinToggle.checked) {
      state.onionSkin = true;
    }
    renderStage();
    return;
  }

  stage.setPointerCapture(event.pointerId);
  drawStroke(point, point);
}

function moveDrawing(event) {
  if (!state.isDrawing || state.tool === 'fill') return;

  const point = getMousePosition(event);
  drawStroke(state.lastPoint, point);
  state.lastPoint = point;
}

function endDrawing(event) {
  if (!state.isDrawing) return;

  state.isDrawing = false;
  state.lastPoint = null;

  if (event && typeof event.pointerId === 'number') {
    stage.releasePointerCapture(event.pointerId);
  }

  snapshotCurrentFrame();

  if (onionSkinToggle.checked) {
    state.onionSkin = true;
  }
  renderStage();
}

function fillArea(point, fillColor) {
  const imageData = ctx.getImageData(0, 0, stageWidth, stageHeight);
  const { data } = imageData;
  const target = getPixelAt(data, point.x, point.y);
  const replacement = hexToRgba(fillColor);

  if (!target || !replacement) return;

  const queue = [{ x: Math.round(point.x), y: Math.round(point.y) }];
  const visited = new Set();

  while (queue.length) {
    const current = queue.pop();
    if (!current) continue;

    const key = `${current.x},${current.y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (current.x < 0 || current.y < 0 || current.x >= stageWidth || current.y >= stageHeight) {
      continue;
    }

    const pixel = getPixelAt(data, current.x, current.y);
    if (!pixel) continue;

    if (colorMatches(pixel, target)) {
      setPixelAt(data, current.x, current.y, replacement);
      queue.push({ x: current.x + 1, y: current.y });
      queue.push({ x: current.x - 1, y: current.y });
      queue.push({ x: current.x, y: current.y + 1 });
      queue.push({ x: current.x, y: current.y - 1 });
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function getPixelAt(data, x, y) {
  if (x < 0 || y < 0 || x >= stageWidth || y >= stageHeight) {
    return null;
  }

  const index = (Math.round(y) * stageWidth + Math.round(x)) * 4;
  return [data[index], data[index + 1], data[index + 2], data[index + 3]];
}

function setPixelAt(data, x, y, [r, g, b, a]) {
  const index = (Math.round(y) * stageWidth + Math.round(x)) * 4;
  data[index] = r;
  data[index + 1] = g;
  data[index + 2] = b;
  data[index + 3] = a;
}

function colorMatches(pixelA, pixelB) {
  if (!pixelA || !pixelB) {
    return false;
  }

  return pixelA[0] === pixelB[0] &&
    pixelA[1] === pixelB[1] &&
    pixelA[2] === pixelB[2] &&
    pixelA[3] === pixelB[3];
}

function hexToRgba(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((ch) => ch + ch).join('')
    : clean;
  const numeric = Number.parseInt(full, 16);

  return [
    (numeric >> 16) & 255,
    (numeric >> 8) & 255,
    numeric & 255,
    255,
  ];
}

function stopPlayback() {
  state.playing = false;
  playBtn.textContent = 'Play';
  clearInterval(state.animationTimer);
  state.animationTimer = null;
}

function playAnimation() {
  if (state.playing) {
    stopPlayback();
    return;
  }

  state.playing = true;
  playBtn.textContent = 'Stop';
  let index = state.currentFrameIndex;

  state.animationTimer = setInterval(() => {
    index = (index + 1) % state.frames.length;
    state.currentFrameIndex = index;
    renderStage();
    renderTimeline();
  }, 1000 / state.fps);
}

function exportPng() {
  const anchor = document.createElement('a');
  anchor.href = stage.toDataURL('image/png');
  anchor.download = `flipaclip-remix-frame-${state.currentFrameIndex + 1}.png`;
  anchor.click();
}

function bindEvents() {
  document.querySelectorAll('.tool-button').forEach((button) => {
    button.addEventListener('click', () => setTool(button.dataset.tool));
  });

  brushSizeInput.addEventListener('input', updateBrushMeta);
  opacityRange.addEventListener('input', updateOpacityMeta);
  onionSkinToggle.addEventListener('change', () => {
    state.onionSkin = onionSkinToggle.checked;
    renderStage();
  });

  fpsRange.addEventListener('input', updateFpsMeta);

  playBtn.addEventListener('click', playAnimation);
  exportBtn.addEventListener('click', exportPng);
  newSceneBtn.addEventListener('click', newScene);
  addFrameBtn.addEventListener('click', addBlankFrame);
  duplicateFrameBtn.addEventListener('click', duplicateFrame);
  deleteFrameBtn.addEventListener('click', deleteFrame);
  undoBtn.addEventListener('click', undoFrame);
  clearBtn.addEventListener('click', clearFrame);

  stage.addEventListener('pointerdown', startDrawing);
  stage.addEventListener('pointermove', moveDrawing);
  stage.addEventListener('pointerup', endDrawing);
  stage.addEventListener('pointerleave', endDrawing);
}

function init() {
  setupInitialFrames();
  setTool('pen');
  updateBrushMeta();
  updateOpacityMeta();
  updateFpsMeta();
  bindEvents();
  renderStage();
  renderTimeline();
}

init();
