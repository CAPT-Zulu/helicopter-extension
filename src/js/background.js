// Extension button click event
chrome.action.onClicked.addListener((tab) => {
  // Initial dimensions
  const windowWidth = 800;
  const windowHeight = 600;

  // Create new window at center of the current window
  chrome.windows.getCurrent({}, (currentWindow) => {
    let left = currentWindow ? Math.round(currentWindow.left + (currentWindow.width - windowWidth) / 2) : 100;
    let top = currentWindow ? Math.round(currentWindow.top + (currentWindow.height - windowHeight) / 2) : 100;

    // Create new window
    chrome.windows.create({
      url: chrome.runtime.getURL("index.html"),
      type: "popup",
      width: windowWidth,
      height: windowHeight,
      left: Math.max(0, left),
      top: Math.max(0, top)
    });
  });
});