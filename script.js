const toggleButton = document.getElementById("theme-toggle");
const animationToggle = document.getElementById("animation-toggle");
const yearSpan = document.getElementById("year");
const mandelbrotCanvas = document.getElementById("mandelbrot-background");
const homeHero = document.getElementById("home-hero");
const homeView = document.getElementById("home-view");
const updatesView = document.getElementById("updates-view");
const pageNavLink = document.getElementById("page-nav-link");
const siteName = document.querySelector(".site-name");
const backToTopLink = document.getElementById("back-to-top");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

const themeStorageKey = "theme";
const mandelbrotStorageKey = "mandelbrot-tour-start-time";
const mandelbrotSeedStorageKey = "mandelbrot-tour-seed";
const mandelbrotPausedStorageKey = "mandelbrot-tour-paused";
const mandelbrotPausedElapsedStorageKey = "mandelbrot-tour-paused-elapsed";

let renderMandelbrot = null;
let setMandelbrotPaused = null;
let mandelbrotPaused = false;

function readStoredValue(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // The animation still works when local storage is unavailable.
  }
}

function removeStoredValue(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // The animation still works when local storage is unavailable.
  }
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");

  if (renderMandelbrot) {
    renderMandelbrot();
  }
}

function getInitialTheme() {
  const savedTheme = readStoredValue(themeStorageKey);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return systemTheme.matches ? "dark" : "light";
}

applyTheme(getInitialTheme());

if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

function isUpdatesView() {
  return window.location.hash === "#updates";
}

function updatePageView(showUpdates) {
  if (!homeView || !updatesView) {
    return;
  }

  homeHero.hidden = showUpdates;
  homeView.hidden = showUpdates;
  updatesView.hidden = !showUpdates;

  if (pageNavLink) {
    pageNavLink.href = showUpdates ? "#home" : "#updates";
    pageNavLink.textContent = showUpdates ? "Home" : "Updates";
  }

  if (backToTopLink) {
    backToTopLink.hidden = showUpdates;
  }

  document.title = showUpdates
    ? "Selected Updates · Maximilian Krupop"
    : "Maximilian Krupop";
}

function navigateToPage(showUpdates) {
  const nextHash = showUpdates ? "#updates" : "#home";

  if (window.location.hash !== nextHash) {
    window.history.pushState({}, "", nextHash);
  }

  updatePageView(showUpdates);
  window.scrollTo({ top: 0, behavior: "auto" });
}

if (pageNavLink) {
  pageNavLink.addEventListener("click", (event) => {
    event.preventDefault();
    navigateToPage(isUpdatesView() ? false : true);
  });
}

if (siteName) {
  siteName.addEventListener("click", (event) => {
    event.preventDefault();
    navigateToPage(false);
  });
}

if (backToTopLink) {
  backToTopLink.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "auto" });
  });
}

window.addEventListener("popstate", () => updatePageView(isUpdatesView()));
window.addEventListener("hashchange", () => updatePageView(isUpdatesView()));
updatePageView(isUpdatesView());

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark");
    const newTheme = isDark ? "light" : "dark";

    applyTheme(newTheme);
    writeStoredValue(themeStorageKey, newTheme);
  });
}

function handleSystemThemeChange(event) {
  const savedTheme = readStoredValue(themeStorageKey);

  if (!savedTheme) {
    applyTheme(event.matches ? "dark" : "light");
  }
}

if (typeof systemTheme.addEventListener === "function") {
  systemTheme.addEventListener("change", handleSystemThemeChange);
} else if (typeof systemTheme.addListener === "function") {
  systemTheme.addListener(handleSystemThemeChange);
}

function updateAnimationToggle(isPaused) {
  if (!animationToggle) {
    return;
  }

  animationToggle.setAttribute("aria-pressed", String(isPaused));
  animationToggle.setAttribute(
    "aria-label",
    isPaused ? "Play background animation" : "Pause background animation"
  );
  animationToggle.title = isPaused
    ? "Play background animation"
    : "Pause background animation";
}

mandelbrotPaused = readStoredValue(mandelbrotPausedStorageKey) === "true";
updateAnimationToggle(mandelbrotPaused);

if (animationToggle) {
  animationToggle.addEventListener("click", () => {
    const nextPaused = !mandelbrotPaused;

    mandelbrotPaused = nextPaused;
    updateAnimationToggle(nextPaused);

    if (setMandelbrotPaused) {
      setMandelbrotPaused(nextPaused);
    }
  });
}

function initializeMandelbrot() {
  if (!mandelbrotCanvas) {
    return;
  }

  const context = mandelbrotCanvas.getContext("2d");

  if (!context) {
    return;
  }

  const storedStartTime = Number(readStoredValue(mandelbrotStorageKey));
  let timelineStartTime = Number.isFinite(storedStartTime) && storedStartTime > 0
    ? storedStartTime
    : Date.now();

  if (!(Number.isFinite(storedStartTime) && storedStartTime > 0)) {
    writeStoredValue(mandelbrotStorageKey, String(timelineStartTime));
  }

  let animationPaused = mandelbrotPaused;
  let pausedElapsed = Number(readStoredValue(mandelbrotPausedElapsedStorageKey));

  if (!animationPaused || !Number.isFinite(pausedElapsed) || pausedElapsed < 0) {
    pausedElapsed = null;
  }

  const initialCenterX = 0.25;
  const initialCenterY = 0;
  const initialViewWidth = 4.8;
  const zoomDuration = 58;
  const zoomOutDuration = 30;
  const segmentDuration = zoomDuration + zoomOutDuration;
  const endViewWidth = initialViewWidth / Math.exp(8);
  const rotationPerPhase = Math.PI / 12;
  const renderInterval = 1000 / 8;

  // Curated complex-plane locations near visually rich Mandelbrot boundaries.
  const interestingLocations = [
    { x: -0.743643887037151, y: 0.13182590420533 },
    { x: -0.7453, y: 0.1127 },
    { x: -0.235125, y: 0.827215 },
    { x: -0.228, y: 0.657 },
    { x: -0.562, y: 0.642 },
    { x: 0.285, y: 0.01 }
  ];

  function createRandomGenerator(seed) {
    let state = seed >>> 0;

    return () => {
      state = (state + 0x6D2B79F5) | 0;
      let value = Math.imul(state ^ (state >>> 15), state | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleLocations(seed) {
    const locations = [...interestingLocations];
    const random = createRandomGenerator(seed);

    for (let index = locations.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [locations[index], locations[swapIndex]] = [locations[swapIndex], locations[index]];
    }

    return locations;
  }

  const storedSeed = Number(readStoredValue(mandelbrotSeedStorageKey));
  const tourSeed = Number.isFinite(storedSeed) && storedSeed >= 0 && storedSeed <= 0xFFFFFFFF
    ? storedSeed >>> 0
    : Math.floor(Math.random() * 4294967296) >>> 0;
  const tourDuration = segmentDuration * interestingLocations.length;

  if (!(Number.isFinite(storedSeed) && storedSeed >= 0 && storedSeed <= 0xFFFFFFFF)) {
    writeStoredValue(mandelbrotSeedStorageKey, String(tourSeed));
  }

  let pixelWidth = 0;
  let pixelHeight = 0;
  let lastRender = 0;
  let animationFrame = 0;
  let lastVisibleImage = null;
  let lastVisibleInk = null;

  function resizeCanvas() {
    const viewportWidth = Math.max(window.innerWidth, 1);
    const viewportHeight = Math.max(window.innerHeight, 1);
    const nextPixelWidth = Math.max(96, Math.min(240, Math.floor(viewportWidth / 5)));
    const nextPixelHeight = Math.max(
      54,
      Math.round(nextPixelWidth * viewportHeight / viewportWidth)
    );

    if (nextPixelWidth === pixelWidth && nextPixelHeight === pixelHeight) {
      return;
    }

    pixelWidth = nextPixelWidth;
    pixelHeight = nextPixelHeight;
    mandelbrotCanvas.width = pixelWidth;
    mandelbrotCanvas.height = pixelHeight;
    context.imageSmoothingEnabled = false;
    lastVisibleImage = null;
    lastVisibleInk = null;
  }

  function getZoomInCamera(location, progress, startRotation) {
    const zoom = Math.exp(
      Math.log(initialViewWidth / endViewWidth) * progress
    );

    return {
      viewWidth: initialViewWidth / zoom,
      centerX: location.x + (initialCenterX - location.x) / zoom,
      centerY: location.y + (initialCenterY - location.y) / zoom,
      rotation: startRotation + rotationPerPhase * progress
    };
  }

  function getZoomOutCamera(location, progress, startRotation) {
    const zoom = Math.exp(
      Math.log(initialViewWidth / endViewWidth) * (1 - progress)
    );

    return {
      viewWidth: initialViewWidth / zoom,
      centerX: location.x + (initialCenterX - location.x) / zoom,
      centerY: location.y + (initialCenterY - location.y) / zoom,
      rotation: startRotation + rotationPerPhase + rotationPerPhase * progress
    };
  }

  function getCamera(elapsedSeconds) {
    const cycleIndex = Math.floor(elapsedSeconds / tourDuration);
    const tourTime = elapsedSeconds - cycleIndex * tourDuration;
    const tourOrder = shuffleLocations(
      (tourSeed + Math.imul(cycleIndex, 0x9E3779B9)) >>> 0
    );
    const segmentIndex = Math.floor(tourTime / segmentDuration);
    const segmentTime = tourTime % segmentDuration;
    const currentLocation = tourOrder[segmentIndex];
    const absoluteSegmentIndex = cycleIndex * interestingLocations.length + segmentIndex;
    const startRotation = absoluteSegmentIndex * rotationPerPhase * 2;

    if (segmentTime < zoomDuration) {
      return getZoomInCamera(
        currentLocation,
        segmentTime / zoomDuration,
        startRotation
      );
    }

    return getZoomOutCamera(
      currentLocation,
      (segmentTime - zoomDuration) / zoomOutDuration,
      startRotation
    );
  }

  function drawMandelbrot(now) {
    if (!pixelWidth || !pixelHeight) {
      return;
    }

    const elapsedMilliseconds = animationPaused
      ? pausedElapsed
      : Math.max(0, now - timelineStartTime);
    const elapsedSeconds = elapsedMilliseconds / 1000;
    const camera = getCamera(elapsedSeconds);
    const zoom = initialViewWidth / camera.viewWidth;
    const viewWidth = camera.viewWidth;
    const viewHeight = viewWidth * pixelHeight / pixelWidth;
    const centerX = camera.centerX;
    const centerY = camera.centerY;
    const rotation = camera.rotation;
    const rotationCosine = Math.cos(rotation);
    const rotationSine = Math.sin(rotation);
    const maxIterations = Math.min(120, 56 + Math.floor(Math.log2(zoom) * 3));
    const ink = document.body.classList.contains("dark") ? 255 : 0;
    const imageData = context.createImageData(pixelWidth, pixelHeight);
    const pixels = imageData.data;
    const insideSet = new Uint8Array(pixelWidth * pixelHeight);

    let boundaryPixelCount = 0;

    for (let row = 0; row < pixelHeight; row += 1) {
      const screenY = (row + 0.5 - pixelHeight / 2) * viewHeight / pixelHeight;

      for (let column = 0; column < pixelWidth; column += 1) {
        const screenX = (column + 0.5 - pixelWidth / 2) * viewWidth / pixelWidth;
        const complexX = centerX + screenX * rotationCosine - screenY * rotationSine;
        const complexY = centerY + screenX * rotationSine + screenY * rotationCosine;
        let real = 0;
        let imaginary = 0;
        let iterations = 0;

        while (real * real + imaginary * imaginary <= 4 && iterations < maxIterations) {
          const nextReal = real * real - imaginary * imaginary + complexX;
          imaginary = 2 * real * imaginary + complexY;
          real = nextReal;
          iterations += 1;
        }

        if (iterations === maxIterations) {
          insideSet[row * pixelWidth + column] = 1;
        }
      }
    }

    for (let row = 0; row < pixelHeight; row += 1) {
      for (let column = 0; column < pixelWidth; column += 1) {
        const cellIndex = row * pixelWidth + column;

        if (!insideSet[cellIndex]
          || row === 0
          || row === pixelHeight - 1
          || column === 0
          || column === pixelWidth - 1) {
          continue;
        }

        const touchesOutside = !insideSet[cellIndex - pixelWidth]
          || !insideSet[cellIndex + pixelWidth]
          || !insideSet[cellIndex - 1]
          || !insideSet[cellIndex + 1];

        if (touchesOutside) {
          const pixelIndex = cellIndex * 4;
          pixels[pixelIndex] = ink;
          pixels[pixelIndex + 1] = ink;
          pixels[pixelIndex + 2] = ink;
          pixels[pixelIndex + 3] = 255;
          boundaryPixelCount += 1;
        }
      }
    }

    if (boundaryPixelCount === 0 && lastVisibleImage) {
      if (lastVisibleInk !== ink) {
        for (let index = 0; index < lastVisibleImage.data.length; index += 4) {
          if (lastVisibleImage.data[index + 3]) {
            lastVisibleImage.data[index] = ink;
            lastVisibleImage.data[index + 1] = ink;
            lastVisibleImage.data[index + 2] = ink;
          }
        }

        lastVisibleInk = ink;
      }

      context.putImageData(lastVisibleImage, 0, 0);
      return;
    }

    context.putImageData(imageData, 0, 0);

    if (boundaryPixelCount > 0) {
      lastVisibleImage = imageData;
      lastVisibleInk = ink;
    }
  }

  function animate(timestamp) {
    if (animationPaused) {
      return;
    }

    if (timestamp - lastRender >= renderInterval) {
      drawMandelbrot(Date.now());
      lastRender = timestamp;
    }

    animationFrame = window.requestAnimationFrame(animate);
  }

  function restartAnimation() {
    window.cancelAnimationFrame(animationFrame);

    if (animationPaused) {
      return;
    }

    lastRender = 0;
    drawMandelbrot(Date.now());
    animationFrame = window.requestAnimationFrame(animate);
  }

  function setPaused(nextPaused) {
    if (nextPaused === animationPaused) {
      return;
    }

    const now = Date.now();

    if (nextPaused) {
      pausedElapsed = Math.max(0, now - timelineStartTime);
      animationPaused = true;
      writeStoredValue(mandelbrotPausedStorageKey, "true");
      writeStoredValue(mandelbrotPausedElapsedStorageKey, String(pausedElapsed));
      window.cancelAnimationFrame(animationFrame);
      drawMandelbrot(now);
    } else {
      const elapsed = Number.isFinite(pausedElapsed) ? pausedElapsed : 0;

      timelineStartTime = now - elapsed;
      pausedElapsed = null;
      animationPaused = false;
      removeStoredValue(mandelbrotPausedStorageKey);
      removeStoredValue(mandelbrotPausedElapsedStorageKey);
      writeStoredValue(mandelbrotStorageKey, String(timelineStartTime));
      lastRender = 0;
      drawMandelbrot(now);
      animationFrame = window.requestAnimationFrame(animate);
    }

    mandelbrotPaused = animationPaused;
    updateAnimationToggle(animationPaused);
  }

  setMandelbrotPaused = setPaused;
  updateAnimationToggle(animationPaused);
  resizeCanvas();
  renderMandelbrot = () => drawMandelbrot(Date.now());
  renderMandelbrot();

  if (!animationPaused) {
    animationFrame = window.requestAnimationFrame(animate);
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    renderMandelbrot();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
    } else {
      restartAnimation();
    }
  });
}

initializeMandelbrot();
