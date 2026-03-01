import { Landmark, CephalometricMeasurement } from '@/types';

/**
 * Helper to find landmark by symbol or name
 */
export const findLandmarkBySymbol = (
  landmarks: Landmark[],
  symbol: string
): Landmark | undefined => {
  return landmarks.find(l =>
    l.name === symbol ||
    l.id === symbol ||
    (l as any).symbol === symbol
  );
};

/**
 * Calculate distance between two landmarks
 */
export const calculateDistance = (
  p1: Landmark,
  p2: Landmark,
  pixelToMmRatio: number = 1
): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distanceInPixels = Math.sqrt(dx * dx + dy * dy);
  return distanceInPixels * pixelToMmRatio;
};

/**
 * Calculate angle between three landmarks (angle at p2)
 * Returns angle in degrees
 */
export const calculateAngle = (
  p1: Landmark,
  p2: Landmark,  // This is the vertex point
  p3: Landmark
): number => {
  // Vector from vertex (p2) to p1
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  // Vector from vertex (p2) to p3
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  // Calculate dot product
  const dotProduct = v1.x * v2.x + v1.y * v2.y;

  // Calculate magnitudes
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  // Calculate angle using cosine formula
  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = dotProduct / (mag1 * mag2);
  // Clamp to [-1, 1] to avoid numerical errors with Math.acos
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angleRadians = Math.acos(clampedCos);
  const angleDegrees = angleRadians * (180 / Math.PI);

  return angleDegrees;
};

/**
 * Calculate perpendicular distance from a point to a line
 */
export const calculatePerpendicularDistance = (
  point: Landmark,
  lineStart: Landmark,
  lineEnd: Landmark,
  pixelToMmRatio: number = 1
): number => {
  // Line equation: ax + by + c = 0
  const a = lineEnd.y - lineStart.y;
  const b = lineStart.x - lineEnd.x;
  const c = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y;

  // Perpendicular distance formula
  const distance = Math.abs(a * point.x + b * point.y + c) / Math.sqrt(a * a + b * b);

  return distance * pixelToMmRatio;
};

/**
 * Steiner Analysis - Simplified to essential measurements only
 */
export const steinerAnalysis = (
  landmarks: Landmark[],
  pixelToMmRatio: number = 1
): {
  measurements: CephalometricMeasurement[],
  errors: string[]
} => {
  const errors: string[] = [];
  const measurements: CephalometricMeasurement[] = [];

  // Find required landmarks for Steiner analysis
  const S = findLandmarkBySymbol(landmarks, 'S');
  const N = findLandmarkBySymbol(landmarks, 'N');
  const A = findLandmarkBySymbol(landmarks, 'A');
  const B = findLandmarkBySymbol(landmarks, 'B');
  const Go = findLandmarkBySymbol(landmarks, 'Go');
  const Gn = findLandmarkBySymbol(landmarks, 'Gn');

  // SNA Angle (angle at N between S and A)
  if (S && N && A) {
    const sna = calculateAngle(S, N, A);
    measurements.push({
      id: 'sna',
      name: 'SNA',
      type: 'angle',
      points: ['S', 'N', 'A'],
      value: parseFloat(sna.toFixed(1)),
      unit: 'degrees',
      norm: 82,
      deviation: parseFloat((sna - 82).toFixed(1))
    } as CephalometricMeasurement);
  } else {
    errors.push('Cannot calculate SNA: Missing S, N, or A point');
  }

  // SNB Angle (angle at N between S and B)
  if (S && N && B) {
    const snb = calculateAngle(S, N, B);
    measurements.push({
      id: 'snb',
      name: 'SNB',
      type: 'angle',
      points: ['S', 'N', 'B'],
      value: parseFloat(snb.toFixed(1)),
      unit: 'degrees',
      norm: 80,
      deviation: parseFloat((snb - 80).toFixed(1))
    } as CephalometricMeasurement);
  } else {
    errors.push('Cannot calculate SNB: Missing S, N, or B point');
  }

  // ANB Angle (angle at N between A and B)
  if (A && N && B) {
    const anb = calculateAngle(A, N, B);
    measurements.push({
      id: 'anb',
      name: 'ANB',
      type: 'angle',
      points: ['A', 'N', 'B'],
      value: parseFloat(anb.toFixed(1)),
      unit: 'degrees',
      norm: 2,
      deviation: parseFloat((anb - 2).toFixed(1))
    } as CephalometricMeasurement);
  } else {
    errors.push('Cannot calculate ANB: Missing A, N, or B point');
  }

  // MP Angle (Mandibular Plane to SN)
  if (S && N && Go && Gn) {
    // Calculate angle between two lines (planes)
    const snVector = { x: N.x - S.x, y: N.y - S.y };
    const goGnVector = { x: Gn.x - Go.x, y: Gn.y - Go.y };

    const snAngle = Math.atan2(snVector.y, snVector.x);
    const goGnAngle = Math.atan2(goGnVector.y, goGnVector.x);

    let mandPlaneAngle = Math.abs((goGnAngle - snAngle) * (180 / Math.PI));
    if (mandPlaneAngle > 90) mandPlaneAngle = 180 - mandPlaneAngle;

    measurements.push({
      id: 'mp_angle',
      name: 'MP Angle (GoGn-SN)',
      type: 'angle',
      points: ['Go', 'Gn', 'S', 'N'],
      value: parseFloat(mandPlaneAngle.toFixed(1)),
      unit: 'degrees',
      norm: 32,
      deviation: parseFloat((mandPlaneAngle - 32).toFixed(1))
    } as CephalometricMeasurement);
  } else {
    errors.push('Cannot calculate MP Angle: Missing Go, Gn, S, or N');
  }

  return { measurements, errors };
};

/**
 * Calculate cephalometric planes with their distances
 */
export const calculatePlanes = (
  landmarks: Landmark[],
  pixelToMmRatio: number = 1
): {
  measurements: CephalometricMeasurement[],
  errors: string[]
} => {
  const errors: string[] = [];
  const measurements: CephalometricMeasurement[] = [];

  // S-N Plane
  const S = findLandmarkBySymbol(landmarks, 'S');
  const N = findLandmarkBySymbol(landmarks, 'N');
  if (S && N) {
    const distance = calculateDistance(S, N, pixelToMmRatio);
    measurements.push({
      id: 'sn_plane',
      name: 'S-N Plane',
      type: 'distance',
      points: ['S', 'N'],
      value: parseFloat(distance.toFixed(1)),
      unit: 'mm'
    } as CephalometricMeasurement);
  } else {
    errors.push('Cannot calculate S-N Plane: Missing S or N');
  }

  // Frankfort Horizontal (FH) Plane
  const Po = findLandmarkBySymbol(landmarks, 'Po');
  const Or = findLandmarkBySymbol(landmarks, 'Or');
  if (Po && Or) {
    const distance = calculateDistance(Po, Or, pixelToMmRatio);
    measurements.push({
      id: 'fh_plane',
      name: 'FH Plane (Po-Or)',
      type: 'distance',
      points: ['Po', 'Or'],
      value: parseFloat(distance.toFixed(1)),
      unit: 'mm'
    } as CephalometricMeasurement);
  } else {
    errors.push('Cannot calculate FH Plane: Missing Po or Or');
  }

  // Palatal Plane
  const ANS = findLandmarkBySymbol(landmarks, 'ANS');
  const PNS = findLandmarkBySymbol(landmarks, 'PNS');
  if (ANS && PNS) {
    const distance = calculateDistance(ANS, PNS, pixelToMmRatio);
    measurements.push({
      id: 'palatal_plane',
      name: 'Palatal Plane (ANS-PNS)',
      type: 'distance',
      points: ['ANS', 'PNS'],
      value: parseFloat(distance.toFixed(1)),
      unit: 'mm'
    } as CephalometricMeasurement);
  } else {
    errors.push('Cannot calculate Palatal Plane: Missing ANS or PNS');
  }

  // AB Plane
  const A = findLandmarkBySymbol(landmarks, 'A');
  const B = findLandmarkBySymbol(landmarks, 'B');
  if (A && B) {
    const distance = calculateDistance(A, B, pixelToMmRatio);
    measurements.push({
      id: 'ab_plane',
      name: 'AB Plane',
      type: 'distance',
      points: ['A', 'B'],
      value: parseFloat(distance.toFixed(1)),
      unit: 'mm'
    } as CephalometricMeasurement);
  } else {
    errors.push('Cannot calculate AB Plane: Missing A or B');
  }

  // Mandibular Plane (MP)
  const Go = findLandmarkBySymbol(landmarks, 'Go');
  const Gn = findLandmarkBySymbol(landmarks, 'Gn');
  if (Go && Gn) {
    const distance = calculateDistance(Go, Gn, pixelToMmRatio);
    measurements.push({
      id: 'mp_plane',
      name: 'MP (Go-Gn)',
      type: 'distance',
      points: ['Go', 'Gn'],
      value: parseFloat(distance.toFixed(1)),
      unit: 'mm'
    } as CephalometricMeasurement);
  } else {
    errors.push('Cannot calculate MP: Missing Go or Gn');
  }

  // Facial Plane (N-Pog)
  const Pog = findLandmarkBySymbol(landmarks, 'Pog');
  if (N && Pog) {
    const distance = calculateDistance(N, Pog, pixelToMmRatio);
    measurements.push({
      id: 'facial_plane',
      name: 'Facial Plane (N-Pog)',
      type: 'distance',
      points: ['N', 'Pog'],
      value: parseFloat(distance.toFixed(1)),
      unit: 'mm'
    } as CephalometricMeasurement);
  } else {
    errors.push('Cannot calculate Facial Plane: Missing N or Pog');
  }

  return { measurements, errors };
};
