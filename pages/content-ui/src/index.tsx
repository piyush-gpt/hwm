import { createRoot } from 'react-dom/client';
import { TitleEvalResult, Analyzing } from '@src/app';
import { savedSettingsStorage, savedGoalsStorage } from '@chrome-extension-boilerplate/storage';
// eslint-disable-next-line
// @ts-ignore
import tailwindcssOutput from '@src/tailwind-output.css?inline';
import { ReactElement } from 'react';

function addCoveredComponent(node: HTMLElement, id: string, component: ReactElement): void {
  // Create new component if it does not exist
  const root = document.createElement('div');
  root.id = id;

  node.append(root);

  const rootIntoShadow = document.createElement('div');
  rootIntoShadow.id = 'shadow-root';

  root.style.position = 'absolute';
  root.style.width = '100%';
  root.style.height = '100%';
  root.style.left = '0';
  root.style.top = '0';

  rootIntoShadow.style.width = '100%';
  rootIntoShadow.style.height = '100%';

  const shadowRoot = root.attachShadow({ mode: 'open' });
  shadowRoot.appendChild(rootIntoShadow);

  /** Inject styles into shadow dom */
  const styleElement = document.createElement('style');
  styleElement.innerHTML = tailwindcssOutput;
  shadowRoot.appendChild(styleElement);

  createRoot(rootIntoShadow).render(component);
}

function addAnalyzingSpinner(id: string) {
  const root = document.createElement('div');
  root.id = id;

  document.body.appendChild(root);

  const rootIntoShadow = document.createElement('div');
  rootIntoShadow.id = 'shadow-root';

  root.style.position = 'fixed';
  root.style.top = '-100px';
  root.style.left = '50%';
  root.style.transform = 'translateX(-50%)';
  root.style.zIndex = '9999';
  root.style.transition = 'top 0.3s ease-out';

  rootIntoShadow.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  rootIntoShadow.style.borderRadius = '20px';
  rootIntoShadow.style.padding = '16px';
  rootIntoShadow.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

  const shadowRoot = root.attachShadow({ mode: 'open' });
  shadowRoot.appendChild(rootIntoShadow);

  const styleElement = document.createElement('style');
  styleElement.innerHTML = tailwindcssOutput;
  shadowRoot.appendChild(styleElement);

  createRoot(rootIntoShadow).render(<Analyzing />);

  // Trigger the animation after a short delay
  setTimeout(() => {
    root.style.top = '60px';
  }, 30);
}

function removeAnalyzingSpinner(id: string) {
  const root = document.getElementById(id);

  if (root) {
    root.style.top = '-100px';
    root.style.opacity = '0';
    root.style.transition = 'top 0.3s ease-out, opacity 0.3s ease-out';
    setTimeout(() => {
      root.parentNode?.removeChild(root);
    }, 300); // Wait for the transition to complete before removing
  }
}


interface EvaluationResult {
  evaluation_rating: string;
  evaluation_context: string;
}

function addWarningForVideo(node: HTMLElement, id: string, result: EvaluationResult,summary:string, onUnblock: () => void) {
  addCoveredComponent(
    node,
    id,
    <div className="w-full h-[500px] flex justify-center items-center px-16">
      <TitleEvalResult result={result} summary={summary} onUnblock={() => {
        const warningElement = document.getElementById(id);
        if (warningElement) {
          warningElement.style.display = 'none';
        }
        onUnblock();
      }} />{' '}
    </div>,
  );
}

function addTitleEval(result: EvaluationResult, node: HTMLElement, summary: string) {
  const existingRoot = document.getElementById('title-eval');

  if (existingRoot) {
    // Update the existing component if it already exists
    const shadowRoot = existingRoot.shadowRoot;
    const contentComponent = shadowRoot?.getElementById('shadow-root');
    if (contentComponent) {
      createRoot(contentComponent).render(<TitleEvalResult result={result} summary={summary}/>);
    }
  } else {
    // Create new component if it does not exist
    const root = document.createElement('div');
    root.id = 'title-eval';

    node.append(root);

    const rootIntoShadow = document.createElement('div');
    rootIntoShadow.id = 'shadow-root';

    const shadowRoot = root.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(rootIntoShadow);

    /** Inject styles into shadow dom */
    const styleElement = document.createElement('style');
    styleElement.innerHTML = tailwindcssOutput;
    shadowRoot.appendChild(styleElement);

    createRoot(rootIntoShadow).render(<TitleEvalResult result={result} summary={summary}  />);
  }
}

let shouldPauseVideo = true; // Global flag to control video pausing

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeName.toLowerCase() === 'video') {
        const videoNode = node as HTMLVideoElement;
        videoNode.addEventListener('play', () => {
          if (shouldPauseVideo) {
            console.log('Video started playing, pausing video...');
            videoNode.pause();
            observer.disconnect();
          }
        });

        if (!videoNode.paused && shouldPauseVideo) {
          console.log('Video is already playing, pausing immediately...');
          videoNode.pause();
          observer.disconnect();
        }
      }
    });
  });
});

observer.observe(document, { childList: true, subtree: true });

function hideArea(selector: string) {
  const targetElement = document.querySelector(selector) as HTMLElement;
  if (targetElement) {
    targetElement.style.opacity = '0';
  }
}

function showArea(selector: string) {
  const targetElement = document.querySelector(selector) as HTMLElement;
  if (targetElement) {
    targetElement.style.opacity = '1';
  }
}

function removeElementsByIds(ids: string[]) {
  ids.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.parentNode?.removeChild(element);
    }
  });
}

document.addEventListener('yt-navigate-start', () => {
  shouldPauseVideo = true;
});

async function analyzeCurrentVideo(blockerEnabled: boolean, videoEvalEnabled: boolean) {
  const metaDataElement = document.querySelector('ytd-watch-metadata');
  const primaryElement = document.querySelector('ytd-watch-flexy #primary') as HTMLElement;

  if (primaryElement) {
    primaryElement.style.position = 'relative';
  }
  if (blockerEnabled) {
    hideArea('#primary-inner');
    addAnalyzingSpinner('analyzing-video');
    shouldPauseVideo = true;
  } else {
    const videoPlayer = document.querySelector('video.html5-main-video') as HTMLVideoElement;

    shouldPauseVideo = false;
    if (videoPlayer) {
      videoPlayer.play();
    }
  }

  if (metaDataElement && videoEvalEnabled) {
    // Get the video title text
    const videoTitle = metaDataElement.querySelector('yt-formatted-string')?.textContent;

    console.log("Evaluate video: ", videoTitle);
    // Send the video title to the background script
    console.log("video url");
    const videoUrl =  window.location.href;
    console.log("video url", videoUrl);
    const response = await chrome.runtime.sendMessage({ type: 'newVideoLoaded', videoTitle });
    const summary=await chrome.runtime.sendMessage({type: 'newSummaryLoaded',videoUrl })
    console.log("video url", videoUrl);
    console.log("responcw.", response);
    console.log("summary", summary);
    if (blockerEnabled && response.evaluation_rating !== 'relevant') {
      removeAnalyzingSpinner('analyzing-video');
      if (primaryElement) {
        addWarningForVideo(primaryElement, 'video-warning', response,summary, () => {
          showArea('#primary-inner');
          const videoPlayer = document.querySelector('video.html5-main-video') as HTMLVideoElement;
          shouldPauseVideo = false;
          if (videoPlayer) {
            videoPlayer.play();
          }
          const titleElement = document.querySelector('ytd-watch-metadata #title') as HTMLElement;
          if (titleElement) {
            addTitleEval(response, titleElement, summary);
          }
        });
      }
    } else {
      if (blockerEnabled) {
        removeAnalyzingSpinner('analyzing-video');
        showArea('#primary-inner');
        const videoPlayer = document.querySelector('video.html5-main-video') as HTMLVideoElement;
        shouldPauseVideo = false;
        if (videoPlayer) {
          videoPlayer.play();
        }
      }
      const titleElement = document.querySelector('ytd-watch-metadata #title') as HTMLElement;
      if (titleElement) {
        addTitleEval(response, titleElement,summary);
      }
    }
  }
}

async function evaluateAndFilterVideos(videoRenderers: HTMLElement[]) {
  const videos = videoRenderers.map((renderer, index) => {
    const titleElement = renderer.querySelector('#video-title');
    const title = titleElement ? titleElement.textContent?.trim() || '' : '';
    const id = `video-${index}-${Date.now()}`; // Create a unique ID
    renderer.setAttribute('data-video-id', id); // Set the ID as a data attribute
    return { id, title };
  });

  const videoData = { videos };

  const evaluationResults = await chrome.runtime.sendMessage({
    type: 'recommendationsLoaded',
    videoData
  });
  console.log("Evaluation results: ", evaluationResults);
  videoRenderers.forEach((renderer) => {
    const id = renderer.getAttribute('data-video-id');
    const result = evaluationResults.videos.find((video: any) => video.id === id);

    renderer.style.border = '';
    const content = renderer.querySelector('#content');
    if (content instanceof HTMLElement) {
      content.style.opacity = '';
    }
    const dismissible = renderer.querySelector('#dismissible');
    if (dismissible instanceof HTMLElement) {
      dismissible.style.opacity = '';
    }
    if (result) {
      renderer.style.pointerEvents = 'auto';
      renderer.style.filter = ''; // Reset filter to default
    } else {
      renderer.style.pointerEvents = 'none';
      renderer.style.filter = 'blur(10px) grayscale(1)';
    }
  });
  return true;
}

async function analyzeRecommendation() {
  const secondaryElement = document.querySelector('ytd-watch-flexy #secondary') as HTMLElement;

  let lastAnalyzedCount = 0;

  const observer = new MutationObserver(async (mutations, obs) => {
    let videoRecommendations = secondaryElement.querySelectorAll('ytd-compact-video-renderer') as NodeListOf<HTMLElement>;

    // youtube loads 19, 20, or 21 videos at a time
    if (((videoRecommendations.length - lastAnalyzedCount) % 20 === 0 ||
      (videoRecommendations.length - lastAnalyzedCount) % 19 === 0 ||
      (videoRecommendations.length - lastAnalyzedCount) % 21 === 0)
      && videoRecommendations.length > lastAnalyzedCount) {
      obs.disconnect();

      const newVideos = Array.from(videoRecommendations).slice(lastAnalyzedCount);

      if (newVideos.length > 0) {
        newVideos.forEach((renderer, index) => {
          renderer.style.pointerEvents = 'none';
          renderer.style.border = '1px dashed gray';
          renderer.style.borderRadius = '10px';
          const content = renderer.querySelector('#dismissible');
          if (content instanceof HTMLElement) {
            content.style.opacity = '0';
          }
        });
        if (newVideos[0]) {
          const spinnerElement = document.createElement('div');
          spinnerElement.style.position = 'relative';
          newVideos[0].parentNode?.insertBefore(spinnerElement, newVideos[0]);
          addAnalyzingSpinner('analyzing-new-related-video');
        }
        await evaluateAndFilterVideos(newVideos);
        removeAnalyzingSpinner('analyzing-new-related-video');
      }

      lastAnalyzedCount = videoRecommendations.length;

      if (secondaryElement) {
        observer.observe(secondaryElement, {
          childList: true,
          subtree: true,
        });
      }
    }
  });

  if (secondaryElement) {
    observer.observe(secondaryElement, {
      childList: true,
      subtree: true,
    });

    // Clean up the observer when navigating away
    const cleanup = () => {
      observer.disconnect();
      document.removeEventListener('yt-navigate-start', cleanup);
    };

    document.addEventListener('yt-navigate-start', cleanup);
  }
}

async function analyzeHome(filterEnabled: boolean) {
  if (filterEnabled) {
    const primaryElement = document.querySelector('ytd-browse #primary') as HTMLElement;

    let videoCount = 0;
    let lastAnalyzedCount = 0;

    const observer = new MutationObserver(async (mutations, obs) => {
      const videoRecommendations = document.querySelectorAll('ytd-rich-item-renderer') as NodeListOf<HTMLElement>;
      if (videoCount === videoRecommendations.length) {
        obs.disconnect();

        const newVideos = Array.from(videoRecommendations).slice(lastAnalyzedCount);
        if (newVideos.length > 0) {
          newVideos.forEach((renderer, index) => {
            renderer.style.pointerEvents = 'none';
            renderer.style.border = '1px dashed gray';
            renderer.style.borderRadius = '10px';
            const content = renderer.querySelector('#content');
            if (content instanceof HTMLElement) {
              content.style.opacity = '0';
            }
          });
          addAnalyzingSpinner('analyzing-new-home-video');
          await evaluateAndFilterVideos(newVideos);

          if (newVideos[0].parentElement?.parentElement) {
            removeAnalyzingSpinner('analyzing-new-home-video');
          }
        }

        lastAnalyzedCount = videoRecommendations.length;

        if (primaryElement) {
          observer.observe(primaryElement, {
            childList: true,
            subtree: true,
          });
        }

      } else {
        videoCount = videoRecommendations.length;
      }
    });

    if (primaryElement) {
      observer.observe(primaryElement, {
        childList: true,
        subtree: true,
      });
    }

    // Clean up the observer when navigating away
    const cleanup = () => {
      observer.disconnect();
      document.removeEventListener('yt-navigate-start', cleanup);
    };

    document.addEventListener('yt-navigate-start', cleanup);
  }
}

function hideShorts() {
  const existingStyle = document.getElementById('hide-shorts-style');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'hide-shorts-style';
    style.innerHTML = `
      ytd-rich-shelf-renderer, ytd-reel-shelf-renderer {
          display: none !important;
      }
    `;
    document.head.appendChild(style);
  }
};


document.addEventListener('yt-page-data-updated', async () => {
  removeElementsByIds([
    'analyzing-video',
    'analyzing-home-video',
    'analyzing-related-videos',
    'video-warning',
    'title-eval',
  ]);
  const { blockerEnabled,
    videoEvalEnabled,
    filterEnabled,
    hideShortsEnabled
  } = await savedSettingsStorage.get();

  const { helpful, harmful } = await savedGoalsStorage.get();

  if (hideShortsEnabled) {
    hideShorts();
  }

  if (helpful || harmful) {
    if (window.location.pathname.includes('/watch')) {
      if (blockerEnabled || videoEvalEnabled) {
        analyzeCurrentVideo(blockerEnabled, videoEvalEnabled);
      } else {
        const videoPlayer = document.querySelector('video.html5-main-video') as HTMLVideoElement;
        shouldPauseVideo = false;
        if (videoPlayer) {
          videoPlayer.play();
        }
      }
      if (filterEnabled) {
        analyzeRecommendation();
      }
    }
    if (window.location.href === 'https://www.youtube.com/' || window.location.href.includes('youtube.com/feed/subscriptions')) {
      const videoPlayer = document.querySelector('video.html5-main-video') as HTMLVideoElement;
      shouldPauseVideo = false;
      if (videoPlayer) {
        videoPlayer.play();
      }
      if (filterEnabled) {
        analyzeHome(filterEnabled);
      }
    }
  } else if (!helpful && !harmful) {
    await chrome.runtime.sendMessage({
      type: 'showGoalsBadge',
    });
  }
  else {
    const videoPlayer = document.querySelector('video.html5-main-video') as HTMLVideoElement;
    shouldPauseVideo = false;
    if (videoPlayer) {
      videoPlayer.play();
    }
  }
});
