import { Landmark, GestureData, Direction } from './types';

export const countFingers = (landmarks: any, handedness: string) => {
  const fingers = {
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false
  };

  // Thumb detection: uses the horizontal distance relative to the hand orientation
  // MediaPipe handedness is mirrored in the webcam feed
  const thumbTip = landmarks[4];
  const thumbBase = landmarks[2];

  if (handedness === 'Right') {
    fingers.thumb = thumbTip.x < thumbBase.x - 0.03;
  } else {
    fingers.thumb = thumbTip.x > thumbBase.x + 0.03;
  }

  // Other fingers: compare tip y with mid-joint y
  // Lower y value means higher in the image
  fingers.index = landmarks[8].y < landmarks[6].y - 0.015;
  fingers.middle = landmarks[12].y < landmarks[10].y - 0.015;
  fingers.ring = landmarks[16].y < landmarks[14].y - 0.015;
  fingers.pinky = landmarks[20].y < landmarks[18].y - 0.015;

  const count = Object.values(fingers).filter(Boolean).length;
  return { fingers, count };
};

export const detectGesture = (landmarks: any, handedness: string): GestureData => {
  const { fingers, count } = countFingers(landmarks, handedness);

  // Special Gestures
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const distanceThumbIndex = Math.sqrt(
    Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
  );

  // Thumbs up
  if (fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    return { name: 'Thumbs Up', emoji: '👍', fingerCount: count, confidence: 0.95, description: 'Affirmative action detected.' };
  }

  // Peace sign
  if (!fingers.thumb && fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
    return { name: 'Peace', emoji: '✌️', fingerCount: count, confidence: 0.95, description: 'Peace/Victory gesture.' };
  }

  // OK gesture
  if (distanceThumbIndex < 0.04 && fingers.middle && fingers.ring && fingers.pinky) {
    return { name: 'OK', emoji: '👌', fingerCount: count, confidence: 0.9, description: 'Precise confirmation detected.' };
  }

  // Rock sign
  if (!fingers.thumb && fingers.index && !fingers.middle && !fingers.ring && fingers.pinky) {
    return { name: 'Rock', emoji: '🤘', fingerCount: count, confidence: 0.95, description: 'Heavy metal vibes.' };
  }

  // Pointing
  if (!fingers.thumb && fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    return { name: 'Pointing', emoji: '☝️', fingerCount: count, confidence: 0.95, description: 'Focusing on a specific point.' };
  }

  // Fist
  if (count === 0) {
    return { name: 'Fist', emoji: '✊', fingerCount: count, confidence: 0.9, description: 'Full grip detected.' };
  }

  // Shaka (Hang Loose)
  if (fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && fingers.pinky) {
    return { name: 'Shaka', emoji: '🤙', fingerCount: count, confidence: 0.95, description: 'Hang loose! Relaxed vibes.' };
  }

  // Spider-Man (Web Shooter)
  if (fingers.thumb && fingers.index && !fingers.middle && !fingers.ring && fingers.pinky) {
    return { name: 'Spider-Man', emoji: '🕸️', fingerCount: count, confidence: 0.95, description: 'Web shooter activated.' };
  }

  // Finger Heart (Thumb + Index crossed/touching, others closed)
  if (distanceThumbIndex < 0.05 && !fingers.middle && !fingers.ring && !fingers.pinky) {
    return { name: 'Love Heart', emoji: '🫰', fingerCount: count, confidence: 0.9, description: 'Sending love via neural link.' };
  }

  // Vulcan Salute (Split between Middle and Ring)
  // Logic: Index/Middle close, Ring/Pinky close, but Middle/Ring far apart
  // indexTip is already defined above
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const distIndexMiddle = Math.hypot(indexTip.x - middleTip.x, indexTip.y - middleTip.y);
  const distRingPinky = Math.hypot(ringTip.x - pinkyTip.x, ringTip.y - pinkyTip.y);
  const distMiddleRing = Math.hypot(middleTip.x - ringTip.x, middleTip.y - ringTip.y);

  if (fingers.index && fingers.middle && fingers.ring && fingers.pinky &&
    distIndexMiddle < 0.05 && distRingPinky < 0.05 && distMiddleRing > 0.05) {
    return { name: 'Vulcan', emoji: '🖖', fingerCount: count, confidence: 0.95, description: 'Live long and prosper.' };
  }

  // High Five / Stop (All fingers open, but not Vulcan)
  if (fingers.thumb && fingers.index && fingers.middle && fingers.ring && fingers.pinky) {
    return { name: 'High Five', emoji: '✋', fingerCount: count, confidence: 0.95, description: 'Hand fully open. Stop or Greeting.' };
  }

  const emojiMap: Record<number, string> = {
    1: '☝️', 2: '✌️', 3: '🤟', 4: '🖖', 5: '✋'
  };

  return {
    name: `${count} Finger${count > 1 ? 's' : ''}`,
    emoji: emojiMap[count] || '👋',
    fingerCount: count,
    confidence: 0.8,
    description: `Recognizing numerical value: ${count}`
  };
};

export const getDirectionFromFingers = (count: number): Direction => {
  switch (count) {
    case 1: return Direction.UP;
    case 2: return Direction.DOWN;
    case 3: return Direction.RIGHT;
    case 4: return Direction.LEFT;
    default: return Direction.NONE;
  }
};
