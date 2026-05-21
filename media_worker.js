const { parentPort } = require('worker_threads');
const { SMTCMonitor } = require('@coooookies/windows-smtc-monitor');

const monitor = new SMTCMonitor();
let currentApp = "";

monitor.on('current-session-changed', (appId) => {
    currentApp = appId;
});

monitor.on('session-media-changed', (appId, media) => {
    if (appId === currentApp || !currentApp) {
        currentApp = appId; 
        parentPort.postMessage({ type: 'music-changed', data: { title: media.title, artist: media.artist } });
    }
});

monitor.on('session-playback-changed', (appId, playback) => {
    if (appId === currentApp || !currentApp) {
        parentPort.postMessage({ type: 'music-state', data: playback.playbackStatus === 4 });
    }
});

monitor.on('session-timeline-changed', (appId, timeline) => {
    if (appId === currentApp || !currentApp) {
        parentPort.postMessage({ 
            type: 'music-progress', 
            data: { 
                current: timeline.position / 10000000, 
                total: timeline.duration / 10000000 
            } 
        });
    }
});