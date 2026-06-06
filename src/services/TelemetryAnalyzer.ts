import { DrivingEvent, Breadcrumb } from './StorageService';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface SensorFrame {
  accelerometer: Vector3D; // m/s^2
  gyroscope: Vector3D;     // rad/s
  timestamp: number;       // ms
}

export interface CalibrationState {
  gravity: Vector3D;
  forward: Vector3D;
  lateral: Vector3D;
  isCalibrated: boolean;
}

export interface AnalysisResult {
  gForceX: number; // Lateral G (left/right)
  gForceY: number; // Longitudinal G (accel/brake)
  gForceZ: number; // Vertical G (bumps)
  detectedEvent: Omit<DrivingEvent, 'id' | 'timestamp'> | null;
  calibration: CalibrationState;
}

// Vector math utilities
const VectorMath = {
  magnitude(v: Vector3D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },
  normalize(v: Vector3D): Vector3D {
    const mag = this.magnitude(v);
    if (mag === 0) return { x: 0, y: 0, z: 1 };
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
  },
  dot(v1: Vector3D, v2: Vector3D): number {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  },
  cross(v1: Vector3D, v2: Vector3D): Vector3D {
    return {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x,
    };
  },
  subtract(v1: Vector3D, v2: Vector3D): Vector3D {
    return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
  },
  add(v1: Vector3D, v2: Vector3D): Vector3D {
    return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
  },
  scale(v: Vector3D, s: number): Vector3D {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  },
  angleBetween(v1: Vector3D, v2: Vector3D): number {
    const m1 = this.magnitude(v1);
    const m2 = this.magnitude(v2);
    if (m1 === 0 || m2 === 0) return 0;
    const dot = this.dot(v1, v2) / (m1 * m2);
    // Clamp dot to [-1, 1] to avoid NaN from floating point errors
    const clamped = Math.max(-1, Math.min(1, dot));
    return Math.acos(clamped); // in radians
  }
};

// Event deductions
export const DEDUCTIONS = {
  harshBraking: 5,
  harshAcceleration: 5,
  sharpTurn: 3,
  aggressiveSteering: 4,
  excessiveMovement: 2,
  phoneHandling: 10,
};

// Standard Gravity constant in m/s^2
const G_CONSTANT = 9.80665;

export const TelemetryAnalyzer = {
  /**
   * Determine driving safety rating based on score
   */
  calculateSafetyRating(score: number): 'Excellent' | 'Good' | 'Average' | 'Risky' {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Average';
    return 'Risky';
  },

  /**
   * Process a sliding window of sensor frames and return whether an event was triggered
   */
  analyzeTelemetry(
    frames: SensorFrame[],
    currentSpeed: number, // m/s
    calibration: CalibrationState,
    sensitivity: 'conservative' | 'standard' | 'aggressive' = 'standard'
  ): AnalysisResult {
    // Sensitivity scale factor
    // Conservative: events trigger more easily (lower thresholds)
    // Standard: default
    // Aggressive: events trigger less easily (higher thresholds)
    const factor = sensitivity === 'conservative' ? 0.85 : sensitivity === 'aggressive' ? 1.15 : 1.0;

    const result: AnalysisResult = {
      gForceX: 0,
      gForceY: 0,
      gForceZ: 0,
      detectedEvent: null,
      calibration: { ...calibration },
    };

    if (frames.length === 0) return result;

    const currentFrame = frames[frames.length - 1];
    const acc = currentFrame.accelerometer;
    const gyro = currentFrame.gyroscope;

    // 1. Update gravity vector estimation if not calibrated
    // We do an exponential moving average (EMA) to filter out transient acceleration
    const alpha = 0.05; // smoothing factor for gravity
    let gravity = calibration.gravity;
    
    if (gravity.x === 0 && gravity.y === 0 && gravity.z === 0) {
      gravity = { ...acc };
    } else {
      gravity = {
        x: alpha * acc.x + (1 - alpha) * gravity.x,
        y: alpha * acc.y + (1 - alpha) * gravity.y,
        z: alpha * acc.z + (1 - alpha) * gravity.z,
      };
    }

    result.calibration.gravity = gravity;
    const gravityUnit = VectorMath.normalize(gravity);

    // 2. Project accelerometer data to horizontal plane
    // Vertical acceleration (along gravity vector)
    const aVertMag = VectorMath.dot(acc, gravityUnit);
    const aVertVec = VectorMath.scale(gravityUnit, aVertMag);
    // Horizontal acceleration vector (orthogonal to gravity)
    const aHorizVec = VectorMath.subtract(acc, aVertVec);

    // 3. Establish forward & lateral axes
    let forward = calibration.forward;
    let lateral = calibration.lateral;

    const accHorizMag = VectorMath.magnitude(aHorizVec);
    const gyroMag = VectorMath.magnitude(gyro);

    // Auto-calibration of forward vector:
    // When accelerating straight (low rotation rate, significant horizontal acceleration)
    if (
      !calibration.isCalibrated &&
      gyroMag < 0.15 &&
      accHorizMag > 1.2 &&
      currentSpeed > 2.0
    ) {
      forward = VectorMath.normalize(aHorizVec);
      lateral = VectorMath.normalize(VectorMath.cross(gravityUnit, forward));
      result.calibration.forward = forward;
      result.calibration.lateral = lateral;
      result.calibration.isCalibrated = true;
    }

    // Fallback: If not calibrated, use local axes
    if (!result.calibration.isCalibrated) {
      // Guess phone-vertical layout: y is forward, x is lateral
      forward = VectorMath.normalize(VectorMath.subtract({ x: 0, y: 1, z: 0 }, VectorMath.scale(gravityUnit, VectorMath.dot({ x: 0, y: 1, z: 0 }, gravityUnit))));
      lateral = VectorMath.normalize(VectorMath.cross(gravityUnit, forward));
      result.calibration.forward = forward;
      result.calibration.lateral = lateral;
    }

    // 4. Calculate directional G-forces
    // G-forces in longitudinal (forward/backward) and lateral (left/right)
    const aLong = VectorMath.dot(aHorizVec, forward);
    const aLat = VectorMath.dot(aHorizVec, lateral);
    
    // G units (m/s^2 divided by standard gravity)
    result.gForceX = aLat / G_CONSTANT;
    result.gForceY = aLong / G_CONSTANT;
    result.gForceZ = (aVertMag - VectorMath.magnitude(gravity)) / G_CONSTANT;

    // 5. EVENT DETECTION ALGORITHMS (requires window of frames for stability)
    if (frames.length < 5) return result;

    const windowDuration = 10; // check last 10 frames (~0.5 - 1.0s)
    const recentFrames = frames.slice(-windowDuration);
    
    // Calculate averages and variances in window
    let avgAcc = { x: 0, y: 0, z: 0 };
    let avgGyro = { x: 0, y: 0, z: 0 };
    recentFrames.forEach(f => {
      avgAcc = VectorMath.add(avgAcc, f.accelerometer);
      avgGyro = VectorMath.add(avgGyro, f.gyroscope);
    });
    avgAcc = VectorMath.scale(avgAcc, 1 / recentFrames.length);
    avgGyro = VectorMath.scale(avgGyro, 1 / recentFrames.length);

    let varAcc = 0;
    let varGyro = 0;
    recentFrames.forEach(f => {
      const diffAcc = VectorMath.subtract(f.accelerometer, avgAcc);
      const diffGyro = VectorMath.subtract(f.gyroscope, avgGyro);
      varAcc += VectorMath.dot(diffAcc, diffAcc);
      varGyro += VectorMath.dot(diffGyro, diffGyro);
    });
    varAcc /= recentFrames.length;
    varGyro /= recentFrames.length;

    // A. Detect Excessive Device Movement
    // High-frequency variance in both acceleration and angular rate
    const movementThresholdAcc = 2.0 * factor;
    const movementThresholdGyro = 1.5 * factor;
    if (varAcc > movementThresholdAcc && varGyro > movementThresholdGyro) {
      result.detectedEvent = {
        type: 'excessiveMovement',
        gForce: accHorizMag / G_CONSTANT,
        pointsDeducted: DEDUCTIONS.excessiveMovement,
      };
      return result;
    }

    // B. Detect Possible Phone Handling During Driving
    // Phone tilt angle change relative to gravity vector
    // We compare gravity direction at the start of the window vs end of the window
    const firstFrameInWindow = recentFrames[0];
    const angleShift = VectorMath.angleBetween(firstFrameInWindow.accelerometer, acc);
    const angleShiftDeg = angleShift * (180 / Math.PI);
    
    // If phone tilts by more than 15 degrees while rotating rapidly (gyroscope active)
    if (angleShiftDeg > 15.0 * factor && gyroMag > 0.6 * factor) {
      result.detectedEvent = {
        type: 'phoneHandling',
        gForce: gyroMag,
        pointsDeducted: DEDUCTIONS.phoneHandling,
      };
      return result;
    }

    // C. Detect Harsh Braking
    // Deceleration in the backward direction (negative forward acceleration)
    const brakingThreshold = -2.8 * factor; // ~ -0.28G
    const isBrakingSustained = recentFrames.filter(f => {
      const fHoriz = VectorMath.subtract(f.accelerometer, VectorMath.scale(gravityUnit, VectorMath.dot(f.accelerometer, gravityUnit)));
      const fLong = VectorMath.dot(fHoriz, forward);
      return fLong < brakingThreshold;
    }).length >= 4; // Sustained for at least 4 frames (~0.4s)

    if (isBrakingSustained && aLong < brakingThreshold) {
      result.detectedEvent = {
        type: 'harshBraking',
        gForce: Math.abs(aLong) / G_CONSTANT,
        pointsDeducted: DEDUCTIONS.harshBraking,
      };
      return result;
    }

    // D. Detect Harsh Acceleration
    // Acceleration in the forward direction
    const accelThreshold = 2.6 * factor; // ~ 0.26G
    const isAccelSustained = recentFrames.filter(f => {
      const fHoriz = VectorMath.subtract(f.accelerometer, VectorMath.scale(gravityUnit, VectorMath.dot(f.accelerometer, gravityUnit)));
      const fLong = VectorMath.dot(fHoriz, forward);
      return fLong > accelThreshold;
    }).length >= 5; // Sustained for at least 5 frames (~0.5s)

    if (isAccelSustained && aLong > accelThreshold) {
      result.detectedEvent = {
        type: 'harshAcceleration',
        gForce: aLong / G_CONSTANT,
        pointsDeducted: DEDUCTIONS.harshAcceleration,
      };
      return result;
    }

    // E. Detect Sharp Turns
    // High lateral G force and high yaw rate (turning around gravity vector)
    const lateralThreshold = 3.0 * factor; // ~ 0.3G
    const yawRate = VectorMath.dot(gyro, gravityUnit);
    const yawThreshold = 0.4 * factor; // ~23 deg/s
    const isTurningSustained = recentFrames.filter(f => {
      const fHoriz = VectorMath.subtract(f.accelerometer, VectorMath.scale(gravityUnit, VectorMath.dot(f.accelerometer, gravityUnit)));
      const fLat = VectorMath.dot(fHoriz, lateral);
      const fYaw = VectorMath.dot(f.gyroscope, gravityUnit);
      return Math.abs(fLat) > lateralThreshold && Math.abs(fYaw) > yawThreshold;
    }).length >= 5;

    if (isTurningSustained && Math.abs(aLat) > lateralThreshold) {
      result.detectedEvent = {
        type: 'sharpTurn',
        gForce: Math.abs(aLat) / G_CONSTANT,
        pointsDeducted: DEDUCTIONS.sharpTurn,
      };
      return result;
    }

    // F. Detect Aggressive Steering (Swerve)
    // Lateral Jerk (rate of change of lateral force) is very high, or rapid reversal in lateral force
    if (recentFrames.length >= 6) {
      const startFrame = recentFrames[recentFrames.length - 6];
      const startHoriz = VectorMath.subtract(startFrame.accelerometer, VectorMath.scale(gravityUnit, VectorMath.dot(startFrame.accelerometer, gravityUnit)));
      const startLat = VectorMath.dot(startHoriz, lateral);
      
      const deltaLat = aLat - startLat;
      const deltaTime = (currentFrame.timestamp - startFrame.timestamp) / 1000; // secs
      const lateralJerk = deltaTime > 0 ? Math.abs(deltaLat / deltaTime) : 0;
      
      // If lateral G swaps polarity quickly and jerk is extremely high
      const jerkThreshold = 6.0 * factor; // m/s^3
      if (lateralJerk > jerkThreshold && Math.abs(aLat) > 2.0 && Math.sign(aLat) !== Math.sign(startLat)) {
        result.detectedEvent = {
          type: 'aggressiveSteering',
          gForce: Math.abs(aLat) / G_CONSTANT,
          pointsDeducted: DEDUCTIONS.aggressiveSteering,
        };
        return result;
      }
    }

    return result;
  },

  /**
   * Local rule-based driver coaching advice
   */
  generateLocalFeedback(score: number, eventCounts: Record<string, number>): string {
    let advice = `### Driving Performance Feedback\n\n`;
    advice += `Your driving safety score was **${score}/100**, placing you in the **${this.calculateSafetyRating(score).toUpperCase()}** category.\n\n`;

    const totalEvents = Object.values(eventCounts).reduce((a, b) => a + b, 0);
    if (totalEvents === 0) {
      return advice + `**Perfect Drive!** You did not trigger any safety events. Your acceleration, braking, and cornering were incredibly smooth. Keep up the excellent work!`;
    }

    advice += `#### Key Observations:\n`;
    if (eventCounts.phoneHandling > 0) {
      advice += `• **Phone Handling detected (${eventCounts.phoneHandling}x):** Safety event triggered. Handheld phone use increases crash risk by 4x. Keep the phone mounted at all times.\n`;
    }
    if (eventCounts.harshBraking > 0) {
      advice += `• **Harsh Braking (${eventCounts.harshBraking}x):** Sudden stops occur when tailgating or not anticipating traffic. Maintain a 3-second buffer distance from the car in front.\n`;
    }
    if (eventCounts.harshAcceleration > 0) {
      advice += `• **Harsh Acceleration (${eventCounts.harshAcceleration}x):** Flooring the gas pedal wastes fuel, strains the transmission, and reduces tire traction. Try rolling onto the accelerator smoothly.\n`;
    }
    if (eventCounts.sharpTurn > 0 || eventCounts.aggressiveSteering > 0) {
      advice += `• **Aggressive Cornering (${(eventCounts.sharpTurn || 0) + (eventCounts.aggressiveSteering || 0)}x):** Taking turns too fast causes vehicles to lose traction or slide. Slow down before entering a turn, not during it.\n`;
    }
    if (eventCounts.excessiveMovement > 0) {
      advice += `• **Excessive Phone Vibration (${eventCounts.excessiveMovement}x):** The device is either sliding around or loose. Secure it in a sturdy phone holder to prevent distraction and false alerts.\n`;
    }

    advice += `\n#### Coaching Tips:\n`;
    advice += `1. **Look Further Ahead**: Scan 10-15 seconds down the road to anticipate traffic stops, reducing the need for panic braking.\n`;
    advice += `2. **The Water Cup Exercise**: Drive as if there is a cup of water on the dashboard and you are trying not to spill a drop. Smooth driving preserves brakes and saves up to 20% on fuel!`;

    return advice;
  },

  /**
   * Generate AI Feedback from Gemini API, or fallback to rule-based feedback
   */
  async generateFeedback(
    score: number,
    events: DrivingEvent[],
    apiKey: string
  ): Promise<string> {
    // Count events
    const eventCounts: Record<string, number> = {
      harshBraking: 0,
      harshAcceleration: 0,
      sharpTurn: 0,
      aggressiveSteering: 0,
      excessiveMovement: 0,
      phoneHandling: 0,
    };
    events.forEach(e => {
      if (eventCounts[e.type] !== undefined) {
        eventCounts[e.type]++;
      }
    });

    if (!apiKey) {
      // Return local rule-based feedback
      return this.generateLocalFeedback(score, eventCounts);
    }

    try {
      const prompt = `You are a professional driving safety assistant and insurance telematics coach.
Here is the summary of a user's driving session:
- Final Safety Score: ${score}/100 (Starts at 100, drops with event deductions)
- Safety Rating: ${this.calculateSafetyRating(score)}
- Event Breakdown:
  - Harsh Braking: ${eventCounts.harshBraking} times
  - Harsh Acceleration: ${eventCounts.harshAcceleration} times
  - Sharp Turns: ${eventCounts.sharpTurn} times
  - Aggressive Steering/Swerve: ${eventCounts.aggressiveSteering} times
  - Excessive Phone Movement (e.g. phone fell or slid): ${eventCounts.excessiveMovement} times
  - Phone Handling/Usage during drive: ${eventCounts.phoneHandling} times

Please write a highly engaging, friendly, and professional driving coaching analysis. 
Format it in Markdown. Start with a summary of their performance, then provide constructive critiques on their detected events, and finally, give them 2-3 specific, actionable tips to improve their safety score and save fuel.
Avoid sounding robotic. Keep it concise, around 150-200 words. Make the tone encouraging.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API Error: Status ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
      throw new Error('Empty response from Gemini');
    } catch (error) {
      console.error('Failed to get Gemini feedback, falling back to local analysis:', error);
      return this.generateLocalFeedback(score, eventCounts);
    }
  },

  /**
   * Helper to generate simulated driving session data for local testing
   */
  generateMockTelemetry(durationSecs: number = 300): { trail: Breadcrumb[]; events: DrivingEvent[] } {
    const trail: Breadcrumb[] = [];
    const events: DrivingEvent[] = [];
    
    // Mock a route around a town starting at index coordinates (e.g. Central Park, NY)
    const startLat = 40.785091;
    const startLng = -73.968285;
    
    let currentLat = startLat;
    let currentLng = startLng;
    let currentSpeed = 0; // m/s
    let currentHeading = 90; // moving East
    
    const intervalSecs = 1; // 1Hz GPS
    
    for (let t = 0; t < durationSecs; t += intervalSecs) {
      const ms = t * 1000;
      
      // Speed profile: accelerate, cruise, brake, turn, etc.
      if (t < 20) {
        // Accelerate smoothly
        currentSpeed += 0.8;
      } else if (t === 45) {
        // Harsh Acceleration event
        currentSpeed += 4.5;
        events.push({
          id: `e-acc-${t}`,
          type: 'harshAcceleration',
          timestamp: ms,
          latitude: currentLat,
          longitude: currentLng,
          gForce: 0.38,
          pointsDeducted: DEDUCTIONS.harshAcceleration,
        });
      } else if (t >= 80 && t < 85) {
        // Turn right by 90 degrees
        currentHeading = (currentHeading + 18) % 360;
        currentSpeed = Math.max(3.0, currentSpeed - 1.2);
        
        if (t === 82) {
          // Sharp Turn event
          events.push({
            id: `e-turn-${t}`,
            type: 'sharpTurn',
            timestamp: ms,
            latitude: currentLat,
            longitude: currentLng,
            gForce: 0.35,
            pointsDeducted: DEDUCTIONS.sharpTurn,
          });
        }
      } else if (t === 140) {
        // Harsh Braking event
        currentSpeed = Math.max(0, currentSpeed - 7.5);
        events.push({
          id: `e-brake-${t}`,
          type: 'harshBraking',
          timestamp: ms,
          latitude: currentLat,
          longitude: currentLng,
          gForce: 0.42,
          pointsDeducted: DEDUCTIONS.harshBraking,
        });
      } else if (t === 200) {
        // Phone Handling event
        events.push({
          id: `e-phone-${t}`,
          type: 'phoneHandling',
          timestamp: ms,
          latitude: currentLat,
          longitude: currentLng,
          gForce: 0.8,
          pointsDeducted: DEDUCTIONS.phoneHandling,
        });
      } else if (t > 270) {
        // Slowing down to stop
        currentSpeed = Math.max(0, currentSpeed - 1.0);
      }
      
      // Update coordinates based on speed and heading
      // 1 deg lat is ~ 111,000 meters
      // 1 deg lng is ~ 111,000 * cos(lat) meters
      const speedKmh = currentSpeed * 3.6;
      const distTraveled = currentSpeed * intervalSecs; // meters
      
      const radHeading = (currentHeading * Math.PI) / 180;
      const dLat = (distTraveled * Math.cos(radHeading)) / 111111;
      const dLng = (distTraveled * Math.sin(radHeading)) / (111111 * Math.cos((currentLat * Math.PI) / 180));
      
      currentLat += dLat;
      currentLng += dLng;
      
      // Add standard small noise to G-Force for telemetry rendering
      const mockG = 0.05 + Math.random() * 0.08 + (currentSpeed > 0 ? 0.02 : 0);
      
      trail.push({
        latitude: currentLat,
        longitude: currentLng,
        speed: currentSpeed,
        timestamp: ms,
        gForce: mockG,
      });
    }
    
    return { trail, events };
  }
};
