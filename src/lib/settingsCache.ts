// Lightweight in-memory cache for frequently checked settings flags.
// Maintained by settings hook updates.

let trackProgress = true

export function setPrivacyTrackFlag(v: boolean) {
  trackProgress = v
}

export function getPrivacyTrackFlag() {
  return trackProgress
}
