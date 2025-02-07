// YouTube IFrame API initialization. Call this export function once the page loads.
export function initYouTubeAPI() {
  let tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  tag.onload = () => {
    console.log('YouTube IFrame API script loaded');
  };
  let firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Minimal player initialization. This implementation avoids third-party cookie issues.
// See https://stackoverflow.com/a/64444601/426853
export function onYouTubeIframeAPIReady() {
  console.log('YouTube IFrame API ready');
  player = new YT.Player('player', {
    height: '0',
    width: '0',
    videoId: '',
    host: 'https://www.youtube-nocookie.com',
    playerVars: {
      'playsinline': 1,
      origin: window.location.host
    },
    events: {
      'onStateChange': onPlayerStateChange
    }
  });
}

// Handle player state changes
export function onPlayerStateChange(event) {
  const speakerIcons = document.querySelectorAll('.speaker-icon');
  const TIME_TOLERANCE = 0.5; // Half second tolerance

  if (event.data === YT.PlayerState.PLAYING) {
    const currentTime = player.getCurrentTime();
    // Add active class to current speaker icon
    speakerIcons.forEach(icon => {
      const iconTime = parseFloat(icon.dataset.timestamp);
      if (Math.abs(currentTime - iconTime) < TIME_TOLERANCE) {
        icon.classList.add('speaker-icon-active');
      }
    });
  } else if (event.data === YT.PlayerState.ENDED ||
    event.data === YT.PlayerState.PAUSED ||
    event.data === YT.PlayerState.STOPPED) {
    // Remove active class from all speaker icons
    speakerIcons.forEach(icon => {
      icon.classList.remove('speaker-icon-active');
    });
  }
}

export function playYouTubeAt(videoId, timeSeconds, rate = 1.0) {
  // Wait for player to be ready
  if (!player || !player.playVideo) {
    setTimeout(() => playYouTubeAt(videoId, timeSeconds, rate), 100);
    return;
  }
  if (player.getPlayerState() === YT.PlayerState.PLAYING) {
    player.pauseVideo();
    return;
  }
  if (player.getVideoData().video_id !== videoId) {
    player.loadVideoById(videoId, timeSeconds);
  } else {
    player.seekTo(timeSeconds);
  }
  try {
    player.setPlaybackRate(rate);
  } catch (e) {
    alert("Can't play this video at that rate. Check the  video to see what rates are supported.");
    console.log(e);
    return;
  }
  console.log("Playing " + videoId + " from " + timeSeconds + " seconds at " + rate + "x");
  player.playVideo()
}
