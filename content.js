let videoUrlList = [];

// Load the list from storage when the script starts
function loadVideoList() {
  return new Promise((resolve) => {
    browser.storage.local.get(['selectedVideos'], function(result) {
      if (result.selectedVideos) {
        videoUrlList = result.selectedVideos;
      }
      resolve();
    });
  });
}

function createCustomButton(videoUrl) {
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'custom-yt-button-container';

  const button = document.createElement('button');
  button.className = 'custom-yt-button';
  
  const img = document.createElement('img');
  img.alt = "Mark";
  //console.log("videoUrl", videoUrl, videoUrlList, videoUrlList.includes(videoUrl));
  img.src = videoUrlList.includes(videoUrl) 
    ? browser.runtime.getURL('icons/mark_true.png')
    : browser.runtime.getURL('icons/mark_false.png');
  button.appendChild(img);
  
  button.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const videoInfo = getVideoInfo(this);
    if (videoInfo) {
      toggleVideoInList(videoInfo, this);
    } else {
      console.log('Could not find video information');
    }
  });

  buttonContainer.appendChild(button);
  return buttonContainer;
}

function addCustomButtonsToPage() {
    console.log("addCustomButtonsToPage");
    const menuRenderers = document.querySelectorAll('ytd-menu-renderer');
    menuRenderers.forEach(menuRenderer => {
      if (!menuRenderer.querySelector('.custom-yt-button-container')) {
        const ytIconButton = menuRenderer.querySelector('yt-icon-button');
        if (ytIconButton) {
          console.log("ytIconButton", ytIconButton);
          const videoInfo = getVideoInfo(ytIconButton);
          if (videoInfo) {
            const customButtonContainer = createCustomButton(videoInfo.videoUrl);
            ytIconButton.parentNode.insertBefore(customButtonContainer, ytIconButton.nextSibling);
          }
        }
      }
    });
}

function toggleVideoInList(videoInfo, button) {
    if (videoUrlList.includes(videoInfo.videoUrl)){ //remove video 
        videoUrlList = videoUrlList.filter(url => url !== videoInfo.videoUrl);
        console.log("Video removed", videoUrlList)
    } else { //insert video
        videoUrlList.push(videoInfo.videoUrl);
        console.log("Video added", videoUrlList)
    }
    updateButtonImage(button, videoInfo.videoUrl);
    
    // Save the updated list to storage
    browser.storage.local.set({selectedVideos: videoUrlList}).then(() => {
        console.log('Video list updated in storage');
    });
}

function getVideoInfo(element) {
    // Try to find the closest video container
    const videoContainer = element.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer');
    
    if (videoContainer) {
      // For video thumbnails on home page, search results, etc.
    const anchor = videoContainer.querySelector('a#thumbnail');
    if (anchor) {
        const href = anchor.getAttribute('href');
        const videoId = href.split('v=')[1];
        const videoUrl = 'https://www.youtube.com' + href;
        console.log("anchor found", videoId, videoUrl);
        return { videoId, videoUrl };
    }
    console.log("anchor not found");
    }
    
    // If we're on a video page
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    if (videoId) {
      return {
        videoId: videoId,
        videoUrl: window.location.href
      };
    }
    
    // If we couldn't find the video info
    return null;
}

function updateButtonImage(button, videoUrl) {
    const img = button.querySelector('img');
    if (videoUrlList.includes(videoUrl)) {
      img.src = browser.runtime.getURL('icons/mark_true.png');
    } else {
      img.src = browser.runtime.getURL('icons/mark_false.png');
    }
}

// Main execution
loadVideoList().then(() => {
    console.log("loaded videos", videoUrlList);
    // Use a MutationObserver to watch for new ytd-menu-renderer elements
    const observer = new MutationObserver((mutations) => {
    console.log("mutation observer");
    mutations.forEach((mutation) => {
        if (mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && (node.matches('ytd-menu-renderer') || node.querySelector('ytd-menu-renderer'))) {
            console.log("New ytd-menu-renderer found");
            addCustomButtonsToPage();
            }
        });
        }
    });
    });

    observer.observe(document.body, {
    childList: true,
    subtree: true
    });
});

// Also run the function when navigating between videos without a full page reload
document.addEventListener('yt-navigate-finish', () => {
    loadVideoList().then(() => {
    addCustomButtonsToPage();
    });
});

// Also run the function when navigating between videos without a full page reload
document.addEventListener('yt-navigate-finish', addCustomButtonsToPage);
