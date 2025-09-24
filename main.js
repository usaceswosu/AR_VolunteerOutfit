// --- CONFIG ---
const OUTFIT_SCALE = 1.5; // 1.0 = normal size, >1 = bigger, <1 = smaller
const SMOOTHING_ALPHA = 0.3; // smoothing factor for position tracking

// HTML elements
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

// Define outfit sets (similar to ARLifejackets)
const outfitSets = [
  { torso: 'images/lifejacket.png', head: null, name: 'Lifejacket' },
  { torso: 'images/ranger_vest.png', head: 'images/ranger_hat.png', name: 'Ranger' },
  { torso: 'images/volunteer_vest.png', head: 'images/volunteer_hat.png', name: 'Volunteer' }
];

let currentSetIndex = 1; // Start with ranger set (index 1)
let outfitImages = {};
let imagesLoaded = 0;
const totalImages = outfitSets.reduce((count, set) => count + (set.torso ? 1 : 0) + (set.head ? 1 : 0), 0);

// Tracking for smoothing
let prevCoords = null;

// Load all outfit images
function loadOutfitImages() {
  outfitSets.forEach((set, setIndex) => {
    if (set.torso) {
      const torsoImg = new Image();
      torsoImg.onload = () => {
        imagesLoaded++;
        console.log(`Loaded torso image for ${set.name}`);
        checkAllImagesLoaded();
      };
      torsoImg.onerror = () => {
        console.error(`Failed to load torso image: ${set.torso}`);
        imagesLoaded++;
        checkAllImagesLoaded();
      };
      torsoImg.src = set.torso;
      outfitImages[`${setIndex}_torso`] = torsoImg;
    }
    
    if (set.head) {
      const headImg = new Image();
      headImg.onload = () => {
        imagesLoaded++;
        console.log(`Loaded head image for ${set.name}`);
        checkAllImagesLoaded();
      };
      headImg.onerror = () => {
        console.error(`Failed to load head image: ${set.head}`);
        imagesLoaded++;
        checkAllImagesLoaded();
      };
      headImg.src = set.head;
      outfitImages[`${setIndex}_head`] = headImg;
    }
  });
}

function checkAllImagesLoaded() {
  if (imagesLoaded >= totalImages) {
    console.log('All outfit images loaded!');
    createOutfitButtons();
  }
}

// Create outfit selection buttons with image thumbnails
function createOutfitButtons() {
  console.log('Creating outfit buttons with image thumbnails...');
  
  // Remove existing buttons if any
  const existingButtons = document.getElementById('outfit-buttons');
  if (existingButtons) {
    existingButtons.remove();
  }
  
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'outfit-buttons';
  buttonContainer.style.cssText = `
    position: fixed;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 10000;
  `;
  
  outfitSets.forEach((set, index) => {
    const button = document.createElement('button');
    button.style.cssText = `
      width: 80px;
      height: 80px;
      padding: 0;
      border: 3px solid ${index === currentSetIndex ? '#007bff' : '#ffffff'};
      border-radius: 12px;
      cursor: pointer;
      background: #f8f9fa;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      overflow: hidden;
      position: relative;
    `;
    
    // Create image element for the button
    const img = document.createElement('img');
    const imagePath = set.torso || set.head; // Use torso first, fallback to head
    img.src = imagePath;
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: white;
    `;
    img.alt = set.name;
    
    // Add a small label at the bottom
    const label = document.createElement('div');
    label.textContent = set.name;
    label.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0,0,0,0.7);
      color: white;
      font-size: 8px;
      text-align: center;
      padding: 2px;
      font-weight: bold;
    `;
    
    button.appendChild(img);
    button.appendChild(label);
    
    // Event listeners
    button.addEventListener('click', () => {
      console.log(`Button clicked: ${set.name}`);
      switchOutfitSet(index);
    });
    
    button.addEventListener('mouseover', () => {
      button.style.transform = 'translateY(-2px) scale(1.05)';
      button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.transform = 'translateY(0) scale(1)';
      button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    });
    
    buttonContainer.appendChild(button);
  });
  
  document.body.appendChild(buttonContainer);
  console.log('Outfit image buttons created successfully');
}

// Switch outfit set
function switchOutfitSet(newIndex) {
  currentSetIndex = newIndex;
  console.log(`Switched to outfit set: ${outfitSets[currentSetIndex].name}`);
  
  // Update button border styles to show active selection
  const buttons = document.querySelectorAll('#outfit-buttons button');
  buttons.forEach((btn, idx) => {
    btn.style.border = `3px solid ${idx === currentSetIndex ? '#007bff' : '#ffffff'}`;
    btn.style.boxShadow = idx === currentSetIndex 
      ? '0 4px 12px rgba(0,123,255,0.4)' 
      : '0 4px 8px rgba(0,0,0,0.2)';
  });
}

// Enhanced overlay function with better positioning
function overlayImageOnCanvas(img, landmarks, isHead = false) {
  if (!img) return;
  
  const w = canvasElement.width;
  const h = canvasElement.height;
  
  let overlayX, overlayY, overlayWidth, overlayHeight;
  
  if (isHead) {
    // Head/hat positioning (similar to ARLifejackets logic)
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    const shoulderWidth = Math.abs((rightShoulder.x - leftShoulder.x) * w);
    const shoulderCenterX = ((leftShoulder.x + rightShoulder.x) / 2) * w;
    const shoulderCenterY = ((leftShoulder.y + rightShoulder.y) / 2) * h;
    
    overlayWidth = shoulderWidth * 1.2 * OUTFIT_SCALE;
    overlayHeight = overlayWidth; // Keep square for hats
    overlayX = shoulderCenterX - overlayWidth / 2;
    overlayY = shoulderCenterY - overlayHeight * 0.9; // Above shoulders but not over face
    
  } else {
    // Torso positioning (enhanced from ARLifejackets)
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return; // Need hip landmarks for torso
    
    const shoulderWidth = Math.abs((rightShoulder.x - leftShoulder.x) * w);
    const torsoTop = Math.min(leftShoulder.y, rightShoulder.y) * h;
    const torsoBottom = Math.max(leftHip.y, rightHip.y) * h;
    const torsoCenterX = ((leftShoulder.x + rightShoulder.x) / 2) * w;
    
    overlayWidth = shoulderWidth * 1.6 * OUTFIT_SCALE;
    overlayHeight = (torsoBottom - torsoTop) * OUTFIT_SCALE;
    overlayX = torsoCenterX - overlayWidth / 2;
    overlayY = torsoTop - overlayHeight * 0.1; // Slight offset upward
  }
  
  // Apply smoothing if we have previous coordinates
  if (prevCoords) {
    const key = isHead ? 'head' : 'torso';
    if (prevCoords[key]) {
      overlayX = SMOOTHING_ALPHA * overlayX + (1 - SMOOTHING_ALPHA) * prevCoords[key].x;
      overlayY = SMOOTHING_ALPHA * overlayY + (1 - SMOOTHING_ALPHA) * prevCoords[key].y;
      overlayWidth = SMOOTHING_ALPHA * overlayWidth + (1 - SMOOTHING_ALPHA) * prevCoords[key].width;
      overlayHeight = SMOOTHING_ALPHA * overlayHeight + (1 - SMOOTHING_ALPHA) * prevCoords[key].height;
    }
  }
  
  // Save current coordinates for next frame smoothing
  if (!prevCoords) prevCoords = {};
  const key = isHead ? 'head' : 'torso';
  prevCoords[key] = { x: overlayX, y: overlayY, width: overlayWidth, height: overlayHeight };
  
  // Draw the image
  canvasCtx.drawImage(img, overlayX, overlayY, overlayWidth, overlayHeight);
}

// Video setup - fill entire screen
videoElement.onloadedmetadata = () => {
  const videoAspectRatio = videoElement.videoWidth / videoElement.videoHeight;
  const screenAspectRatio = window.innerWidth / window.innerHeight;

  // Set canvas to match video resolution for quality
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  // Force full screen coverage (crop edges if needed)
  let displayWidth, displayHeight;
  if (screenAspectRatio > videoAspectRatio) {
    // Screen is wider - fill width, crop height
    displayWidth = window.innerWidth;
    displayHeight = displayWidth / videoAspectRatio;
  } else {
    // Screen is taller - fill height, crop width
    displayHeight = window.innerHeight;
    displayWidth = displayHeight * videoAspectRatio;
  }
  
  // Position to fill screen completely
  const offsetX = (window.innerWidth - displayWidth) / 2;
  const offsetY = (window.innerHeight - displayHeight) / 2;
  
  videoElement.style.width = displayWidth + 'px';
  videoElement.style.height = displayHeight + 'px';
  canvasElement.style.width = displayWidth + 'px';
  canvasElement.style.height = displayHeight + 'px';
  canvasElement.style.left = offsetX + 'px';
  canvasElement.style.top = offsetY + 'px';
  
  console.log(`Video: ${videoElement.videoWidth}x${videoElement.videoHeight}, Display: ${displayWidth}x${displayHeight}`);
};

// Initialize camera (simplified to avoid multiple permission prompts)
navigator.mediaDevices.getUserMedia({ 
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
}).catch(err => {
  console.warn('High quality camera failed, trying basic:', err);
  // Only fallback if the first attempt fails
  return navigator.mediaDevices.getUserMedia({ video: true });
}).then(stream => {
  videoElement.srcObject = stream;
  console.log('Camera initialized successfully');
}).catch(err => {
  console.error('Failed to access camera:', err);
});

// MediaPipe pose detection setup
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 1, // Increased for better accuracy
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.7, // Increased for better detection
  minTrackingConfidence: 0.5
});

// Enhanced pose results processing
pose.onResults((results) => {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (!results.poseLandmarks) {
    prevCoords = null; // Reset smoothing when no pose detected
    return;
  }

  const landmarks = results.poseLandmarks;
  const currentSet = outfitSets[currentSetIndex];
  
  // Draw torso outfit if available
  if (currentSet.torso && outfitImages[`${currentSetIndex}_torso`]) {
    overlayImageOnCanvas(outfitImages[`${currentSetIndex}_torso`], landmarks, false);
  }
  
  // Draw head outfit if available
  if (currentSet.head && outfitImages[`${currentSetIndex}_head`]) {
    overlayImageOnCanvas(outfitImages[`${currentSetIndex}_head`], landmarks, true);
  }
});

// Start camera and pose detection
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 640, // Reduced to prevent quality issues with MediaPipe
  height: 480
});

// Initialize everything
loadOutfitImages();
camera.start();

// Failsafe: Create buttons after a delay even if images haven't loaded completely
setTimeout(() => {
  const buttonsExist = document.getElementById('outfit-buttons');
  if (!buttonsExist) {
    console.warn('Buttons not created yet, creating them as failsafe...');
    createOutfitButtons();
  }
}, 3000);

console.log('AR Volunteer Outfit system initialized with multiple outfit sets!');
