// render.js
let mediaRecorder;
let recordedChunks = [];
let selectedSource = null;

// Add logging function for renderer process
function log(type, message, error = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${type}: ${message}`);
  if (error) console.error(error);
}

document.addEventListener('DOMContentLoaded', () => {
  const videoSelectBtn = document.getElementById('videoSelectBtn');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const selectedScreenLabel = document.getElementById('selectedScreen');
  const video = document.querySelector('video');

  startBtn.disabled = true;
  stopBtn.disabled = true;

  async function getVideoSources() {
    try {
      log('INFO', 'Requesting video sources');
      const inputSources = await window.electron.getSources();
      const serializedSources = inputSources.map(source => ({
        id: source.id,
        name: source.name,
      }));
      await window.electron.showScreenPopup(serializedSources);
    } catch (error) {
      log('ERROR', 'Failed to get video sources', error);
      alert('Error: Failed to get video sources. Please try again.');
    }
  }

  window.electron.onSourceSelected((event, source) => {
    try {
      selectedSource = source;
      selectedScreenLabel.textContent = `Selected: ${source.name}`;
      startBtn.disabled = false;
      startBtn.classList.remove('is-light');
      log('INFO', `Source selected: ${source.name}`);
    } catch (error) {
      log('ERROR', 'Error handling source selection', error);
    }
  });

  async function startRecording() {
    if (!selectedSource) {
      log('WARNING', 'Attempted to start recording without source selection');
      return;
    }

    try {
      log('INFO', 'Starting recording');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id
          }
        }
      });

      video.srcObject = stream;
      await video.play();

      const options = { mimeType: 'video/webm; codecs=vp9' };
      mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.start();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      selectedScreenLabel.textContent = `Recording: ${selectedSource.name}`;
      selectedScreenLabel.style.color = 'red';
      log('INFO', 'Recording started successfully');
    } catch (error) {
      log('ERROR', 'Failed to start recording', error);
      alert('Error: Failed to start recording. Please try again.');
    }
  }

  async function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      log('WARNING', 'Attempted to stop inactive recorder');
      return;
    }

    try {
      log('INFO', 'Stopping recording');
      mediaRecorder.stop();
      startBtn.disabled = false;
      stopBtn.disabled = true;
      selectedScreenLabel.textContent = `Selected: ${selectedSource.name}`;
      selectedScreenLabel.style.color = '';

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(recordedChunks, {
            type: 'video/webm; codecs=vp9'
          });

          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const filePath = await window.electron.saveRecording(Array.from(uint8Array));
          if (filePath) {
            log('INFO', `Recording saved to: ${filePath}`);
            alert(`Recording saved successfully to:\n${filePath}`);
          }
          recordedChunks = [];

          // Cleanup
          const tracks = video.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          video.srcObject = null;
          log('INFO', 'Recording cleanup completed');
        } catch (error) {
          log('ERROR', 'Failed to save recording', error);
          alert('Error: Failed to save recording. Please try again.');
        }
      };
    } catch (error) {
      log('ERROR', 'Error stopping recording', error);
      alert('Error: Failed to stop recording. Please try again.');
    }
  }

  videoSelectBtn.onclick = getVideoSources;
  startBtn.onclick = startRecording;
  stopBtn.onclick = stopRecording;

  log('INFO', 'Renderer process initialized');
});

// Handle window errors
window.onerror = function(msg, url, lineNo, columnNo, error) {
  log('ERROR', 'Window Error:', error);
  return false;
};

// Handle promise rejections
window.onunhandledrejection = function(event) {
  log('ERROR', 'Unhandled Promise Rejection:', event.reason);
};
const exitBtn = document.getElementById('exit-window').addEventListener('click',()=>{
  window.electron.exitWindow();
});