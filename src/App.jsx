import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Stars, Trail, Billboard, Text, useTexture } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import './index.css';

let globalAudioCtx = null;
let noiseBuffer = null;
let backgroundStarted = false;

const initAudio = () => {
  if (globalAudioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  
  globalAudioCtx = new AudioContext();
  
  // Generate 3 seconds of white noise and cache it
  const bufferSize = globalAudioCtx.sampleRate * 3.0;
  noiseBuffer = globalAudioCtx.createBuffer(1, bufferSize, globalAudioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
};

const startBackgroundAudio = () => {
  if (!globalAudioCtx) initAudio();
  if (backgroundStarted) return;
  
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  
  backgroundStarted = true;
  const ctx = globalAudioCtx;
  
  // --- 1. Cinematic Drone (Peaceful, Meditative Vibe) ---
  const masterDroneGain = ctx.createGain();
  masterDroneGain.gain.value = 0.08; // Very subtle and peaceful
  masterDroneGain.connect(ctx.destination);
  
  // A minor drone chord (A2, E3, A3, C4)
  const freqs = [110.00, 164.81, 220.00, 261.63]; 
  freqs.forEach(freq => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(masterDroneGain);
    osc.start();
  });

  // --- 2. Deep Space Rumble Ambience ---
  const rumbleNoise = ctx.createBufferSource();
  rumbleNoise.buffer = noiseBuffer;
  rumbleNoise.loop = true;
  
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.value = 80; // Extremely deep cinematic rumble
  
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.4;
  
  rumbleNoise.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(ctx.destination);
  
  rumbleNoise.start();
};

const playScrollSound = () => {
  try {
    if (!globalAudioCtx) initAudio();
    if (!backgroundStarted) startBackgroundAudio();
    if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
    
    const ctx = globalAudioCtx;
    
    // Play the thrust / swoosh
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const duration = 2.2; // Extended duration for a cinematic, slow fade
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + duration);
    
    // Mix the thrust sound perfectly above the ambient track
    const gainNode = ctx.createGain();
    // Start slightly louder to compensate for longer fade
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    noiseSource.start();
    noiseSource.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

// --------------------------------------------------------
// 1. THE ACCRETION DISK (Black Hole Particles)
// --------------------------------------------------------
const AccretionDisk = () => {
  const points = useRef();
  
  // Reduced from 20,000 to 8,000 for smoother laptop performance
  const particleCount = 20000;
  const [positions, colors, basePositions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const basePos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    
    for(let i=0; i<particleCount; i++) {
      // Radius from 15 to 100 units
      const radius = 15 + Math.random() * 85;
      const angle = Math.random() * Math.PI * 2;
      // Disk gets thinner as it goes out
      const height = (Math.random() - 0.5) * (150 / radius);
      
      pos[i*3] = Math.cos(angle) * radius;
      pos[i*3+1] = height;
      pos[i*3+2] = Math.sin(angle) * radius;
      
      basePos[i*3] = pos[i*3];
      basePos[i*3+1] = pos[i*3+1];
      basePos[i*3+2] = pos[i*3+2];
      
      vel[i*3] = 0;
      vel[i*3+1] = 0;
      vel[i*3+2] = 0;
      
      // Premium Java & Phoenix Theme: Bright Cyan/Blue outer disk -> Fiery Orange/Red core
      const intensity = Math.pow(1 - (radius - 15) / 85, 2);
      let color;
      
      if (intensity > 0.7) {
        // Absolute core: Fiery Orange -> White Hot
        const coreInt = (intensity - 0.7) / 0.3;
        color = new THREE.Color().lerpColors(new THREE.Color('#ff5722'), new THREE.Color('#ffffff'), coreInt);
        color.multiplyScalar(4.0); // Push RGB above 1.0 for massive HDR Bloom
      } else {
        // Main disk: Cyan/Blue -> Phoenix Orange
        const diskInt = intensity / 0.7;
        // Used a brighter blue (#00b4d8) so the outer edges aren't too dark to glow
        color = new THREE.Color().lerpColors(new THREE.Color('#00b4d8'), new THREE.Color('#ff5722'), Math.pow(diskInt, 1.5));
        color.multiplyScalar(2.0); // Boost brightness for the outer edges
      }
      
      col[i*3] = color.r;
      col[i*3+1] = color.g;
      col[i*3+2] = color.b;
    }
    return [pos, col, basePos, vel];
  }, []);

  useFrame((state, delta) => {
    if (!points.current) return;
    
    points.current.rotation.y -= delta * 0.2; // Slowly spin the disk
    points.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.1; // Gentle wobble
    
    const raycaster = state.raycaster;
    const mouseRay = raycaster.ray.clone();
    
    // Transform world mouse ray into the spinning disk's local coordinate space
    const invMatrix = new THREE.Matrix4().copy(points.current.matrixWorld).invert();
    mouseRay.applyMatrix4(invMatrix);
    
    // The disk is flat on the local XZ plane (Y=0)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const localIntersect = new THREE.Vector3();
    const hit = mouseRay.intersectPlane(plane, localIntersect);
    
    const positionsAttr = points.current.geometry.attributes.position;
    const posArray = positionsAttr.array;
    
    const dt = Math.min(delta, 0.1); // Cap delta to prevent physics explosions
    let needsUpdate = false;
    
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const px = posArray[idx];
      const py = posArray[idx+1];
      const pz = posArray[idx+2];
      
      const bx = basePositions[idx];
      const by = basePositions[idx+1];
      const bz = basePositions[idx+2];
      
      // 1. Swirl Repulsion from Mouse Hover
      if (hit) {
        const dx = px - localIntersect.x;
        const dz = pz - localIntersect.z;
        const distSq = dx*dx + dz*dz;
        
        // Repel within a 25-unit radius
        if (distSq < 625 && distSq > 0.1) {
          const dist = Math.sqrt(distSq);
          const force = (25 - dist) / 25;
          
          // Swirl effect: Outward vector + Perpendicular vector (boat wake in sea)
          const pushX = (dx / dist) + (-dz / dist) * 1.5;
          const pushZ = (dz / dist) + (dx / dist) * 1.5;
          
          velocities[idx] += pushX * force * dt * 250;
          velocities[idx+2] += pushZ * force * dt * 250;
          // Splash upwards slightly
          velocities[idx+1] += force * dt * 50;
        }
      }
      
      // 2. High Gravity Pull to Center/Base
      const distToBaseSq = (bx - px)**2 + (by - py)**2 + (bz - pz)**2;
      const velSq = velocities[idx]**2 + velocities[idx+1]**2 + velocities[idx+2]**2;
      
      // Sleep state optimization: only calculate physics if particle is disturbed
      if (distToBaseSq > 0.001 || velSq > 0.001) {
        needsUpdate = true;
        
        // Spring pull back to base position (simulates strong gravity)
        velocities[idx] += (bx - px) * dt * 15.0;
        velocities[idx+1] += (by - py) * dt * 15.0;
        velocities[idx+2] += (bz - pz) * dt * 15.0;
        
        // Friction / Dampening
        velocities[idx] *= 0.85;
        velocities[idx+1] *= 0.85;
        velocities[idx+2] *= 0.85;
        
        posArray[idx] += velocities[idx] * dt;
        posArray[idx+1] += velocities[idx+1] * dt;
        posArray[idx+2] += velocities[idx+2] * dt;
      }
    }
    
    if (needsUpdate) {
      positionsAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.3} vertexColors transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
};

// --------------------------------------------------------
// 1.5 THE PHOENIX TEAM COMET
// --------------------------------------------------------
const Comet = ({ onClick }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // Local state for this specific comet instance
  const velocity = useRef({ x: 0, y: 0, z: 0 });
  const age = useRef(0);

  // Initialize randomized parameters once when this comet mounts
  useMemo(() => {
    velocity.current.x = 20 + Math.random() * 15; // Fly left
    velocity.current.y = 5 + Math.random() * 10;  // Drop down
  }, []);

  useFrame((state, delta) => {
    age.current += delta;

    if (meshRef.current) {
      // 1. If it's the very first frame, snap to starting position
      if (age.current <= delta) {
        const cam = state.camera;
        const spawnPos = new THREE.Vector3(120, -20 + Math.random() * 80, -80);
        spawnPos.applyMatrix4(cam.matrixWorld);
        meshRef.current.position.copy(spawnPos);
      }

      // 2. Realistic Twinkle/Fade (Scale animation)
      // Lifespan is 6 seconds. 
      // 0.0 - 1.0s: Fade in
      // 1.0 - 4.0s: Full size
      // 4.0 - 5.5s: Fade out / Twinkle
      let s = 1;
      if (age.current < 1.0) {
        s = age.current; // 0 to 1
      } else if (age.current > 4.0 && age.current < 5.5) {
        s = 1 - ((age.current - 4.0) / 1.5); // 1 to 0
      } else if (age.current >= 5.5) {
        s = 0;
      }
      
      // Add a slight high-frequency twinkle effect to the scale when visible
      if (s > 0 && s < 1) {
         s += Math.sin(age.current * 20) * 0.1; // rapid wobble
      }
      s = Math.max(0, s); // clamp to 0
      
      meshRef.current.scale.set(s, s, s);

      // 3. Apply velocity
      const cam = state.camera;
      const moveVec = new THREE.Vector3(
        -velocity.current.x * delta,
        -velocity.current.y * delta,
        0
      );
      moveVec.applyQuaternion(cam.quaternion);
      meshRef.current.position.add(moveVec);
    }
  });

  return (
    <group>
      {/* 
        Realistic Comet Tail:
        - length={10}: Short tail (approx 100px depending on speed)
        - decay={3}: Fades out quickly
        - color: Icy white/blue instead of red
        - width: Starts at 3 and tapers off sharply
      */}
      <Trail width={3} color={'#e0f7fa'} length={10} decay={3} attenuation={(t) => t * t}>
        <mesh 
          ref={meshRef} 
          position={[1000, 1000, 1000]} 
          onClick={onClick}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        >
          {/* Invisible Hitbox (Larger than visual comet for easier clicking while it moves) */}
          <sphereGeometry args={[hovered ? 8 : 5, 16, 16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} />
          
          {/* Visual Comet Core */}
          <mesh>
            <sphereGeometry args={[1.5, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </mesh>
      </Trail>
    </group>
  );
};

const CometManager = ({ onClick }) => {
  const [cometKey, setCometKey] = useState(0);

  // Unmount and remount the comet every 6 seconds to completely reset the Trail history
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCometKey(prev => prev + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return <Comet key={cometKey} onClick={onClick} />;
};

// --------------------------------------------------------
// 1.8 THE ASTEROID FIELD
// --------------------------------------------------------
const AsteroidGeometry = () => {
  const geom = useMemo(() => {
    // High polygon count (detail 5) creates a highly realistic, non-triangular rock
    const geometry = new THREE.IcosahedronGeometry(1, 5);
    const posAttribute = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i);
      
      // Round coordinates to 2 decimal places to completely seal seams
      const rx = Math.round(vertex.x * 100) / 100;
      const ry = Math.round(vertex.y * 100) / 100;
      const rz = Math.round(vertex.z * 100) / 100;
      
      // Layered continuous noise for realistic lumpiness without ripping polygons
      const lowFreq = Math.sin(rx * 2) * Math.cos(ry * 2) * Math.sin(rz * 2) * 0.2; // Base potato shape
      const midFreq = Math.sin(rx * 6) * Math.cos(ry * 6) * Math.sin(rz * 6) * 0.05; // Large craters/lumps
      const highFreq = Math.sin(rx * 15) * Math.cos(ry * 15) * Math.sin(rz * 15) * 0.02; // Rough jagged surface
      
      const noise = 1 + lowFreq + midFreq + highFreq;
      vertex.multiplyScalar(noise);
      
      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  return <primitive object={geom} attach="geometry" />;
};

const Asteroids = () => {
  const meshRef = useRef();
  const count = 300; // Increased massively to make them dense and close to camera
  
  const asteroidTexture = useTexture('/asteroid.jpg');
  asteroidTexture.wrapS = THREE.RepeatWrapping;
  asteroidTexture.wrapT = THREE.RepeatWrapping;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const asteroidsData = useMemo(() => {
    return new Array(count).fill().map(() => {
      // Calculate a mass based on the random scale (Volume ~ mass)
      const scaleBase = 2.0 + Math.random() * 8.0; // Much larger so they are visible from far away
      const mass = Math.pow(scaleBase, 3); // Larger rocks will be exponentially heavier

      return {
        // Dense field behind the accretion disk (Z < 0)
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 400,       // -200 to 200 (x)
          (Math.random() - 0.5) * 200,       // -100 to 100 (y)
          // 80% chance to be behind the disk, 20% scattered elsewhere
          Math.random() > 0.2 ? -(Math.random() * 400 + 50) : Math.random() * 300
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        // Make them highly irregular and squashed, avoiding perfect spheres completely
        scale: new THREE.Vector3(
          scaleBase * (0.5 + Math.random() * 1.5), // X stretch
          scaleBase * (0.3 + Math.random() * 0.7), // Y squash (flattened)
          scaleBase * (0.5 + Math.random() * 1.5)  // Z stretch
        ),
        mass: mass,
        velocity: new THREE.Vector3(),
        baseVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5
        ),
        rotationSpeed: new THREE.Euler(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        )
      };
    });
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const mouseRay = state.raycaster.ray;
    
    asteroidsData.forEach((data, i) => {
      // 1. Interpolate velocity back to base velocity VERY slowly (Space has barely any drag)
      data.velocity.lerp(data.baseVelocity, delta * 0.1);
      
      // 2. Mouse Repulsion with MASS physics
      const closestPoint = new THREE.Vector3();
      mouseRay.closestPointToPoint(data.position, closestPoint);
      const dist = closestPoint.distanceTo(data.position);
      
      if (dist < 30) { // If mouse is pointing near asteroid
        const force = (30 - dist) / 30; // 0 to 1 intensity
        const repelDir = data.position.clone().sub(closestPoint).normalize();
        if (repelDir.lengthSq() === 0) repelDir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        
        // F = M * A, so A = F / M. Heavy rocks move very little!
        const acceleration = (force * 15) / data.mass;
        data.velocity.add(repelDir.multiplyScalar(acceleration * delta * 20));
        
        // Spin it based on force and mass
        data.rotationSpeed.x += (Math.random() - 0.5) * force * (2.0 / data.mass);
        data.rotationSpeed.y += (Math.random() - 0.5) * force * (2.0 / data.mass);
      }

      // Move asteroid
      data.position.x += data.velocity.x * delta;
      data.position.y += data.velocity.y * delta;
      data.position.z += data.velocity.z * delta;
      
      // Rotate asteroid
      data.rotation.x += data.rotationSpeed.x * delta;
      data.rotation.y += data.rotationSpeed.y * delta;
      data.rotation.z += data.rotationSpeed.z * delta;
      
      // Wrap around logic safely out of camera view
      if (data.position.x > 150) data.position.x = -150;
      if (data.position.x < -150) data.position.x = 150;
      if (data.position.y > 150) data.position.y = -50;
      if (data.position.y < -50) data.position.y = 150;
      if (data.position.z > 400) data.position.z = -100;
      if (data.position.z < -100) data.position.z = 400;
      
      dummy.position.copy(data.position);
      dummy.rotation.copy(data.rotation);
      dummy.scale.copy(data.scale);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <AsteroidGeometry />
      <meshStandardMaterial 
        map={asteroidTexture}
        bumpMap={asteroidTexture}
        bumpScale={1.5}
        color="#ffffff" 
        roughness={1.0} 
        metalness={0.0}
      />
    </instancedMesh>
  );
};

// --------------------------------------------------------
// 1.8 ASTEROID STRIKE ANIMATION
// --------------------------------------------------------
const AsteroidStrike = () => {
  const meshRef = useRef();
  const [active, setActive] = useState(false);
  const progress = useRef(0);
  const asteroidTexture = useLoader(THREE.TextureLoader, '/asteroid.jpg');
  
  React.useEffect(() => {
    const trigger = () => {
      setActive(true);
      progress.current = 0;
    };
    document.addEventListener('asteroidStrike', trigger);
    return () => document.removeEventListener('asteroidStrike', trigger);
  }, []);
  
  useFrame((state, delta) => {
    if (active && meshRef.current) {
      progress.current += delta * 2.0; // VERY FAST strike! (0.5 seconds)
      
      if (progress.current <= 1.0) {
        // Start from accretion disk (0,0,0) and fly directly into the camera lens!
        const start = new THREE.Vector3(0, 0, 0);
        // We calculate exactly where the camera is right now
        const end = state.camera.position.clone();
        // push end slightly past the camera to ensure it completely fills the screen
        const direction = end.clone().sub(start).normalize();
        end.add(direction.multiplyScalar(10));
        
        // Ease-in acceleration
        const easeIn = progress.current * progress.current;
        meshRef.current.position.lerpVectors(start, end, easeIn);
        
        // Spin it wildly
        meshRef.current.rotation.x += delta * 15;
        meshRef.current.rotation.y += delta * 20;
        
        // Scale it up as it approaches so it engulfs the camera
        const s = 1 + (progress.current * 40);
        meshRef.current.scale.set(s, s, s);
      } else {
        // Strike finished! Trigger white flash CSS
        setActive(false);
        document.dispatchEvent(new Event('triggerWhiteFlash'));
        
        // Delay revealing the image modal by 0.1s so flash peaks
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('updateTestiqoStep', { detail: 1 }));
        }, 100);
        
        // Reset
        meshRef.current.position.set(0, 0, 0);
        meshRef.current.scale.set(1, 1, 1);
      }
    }
  });

  if (!active) return null;

  return (
    <mesh ref={meshRef}>
      <AsteroidGeometry />
      <meshStandardMaterial 
        map={asteroidTexture}
        bumpMap={asteroidTexture}
        bumpScale={2.0}
        color="#ff5722" // Glows red hot as it strikes
        emissive="#ff2a46"
        emissiveIntensity={2.0}
      />
    </mesh>
  );
};

// --------------------------------------------------------
// 2. THE FLIGHT CAMERA & PATH
// --------------------------------------------------------
// Changed curve so the camera slowly approaches but never flies past the Black Hole
const flightCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 80, 300),     // Slide 1
  new THREE.Vector3(40, 60, 250),    // Slide 2
  new THREE.Vector3(60, 40, 200),    // Slide 3
  new THREE.Vector3(30, 25, 150),    // Slide 4
  new THREE.Vector3(-10, 15, 100),   // Slide 5
  new THREE.Vector3(-30, 5, 80),     // Slide 6
  new THREE.Vector3(-45, 0, 70),     // Slide 7 (Final depth)
  new THREE.Vector3(-50, -5, 60)     // Buffer
]);

const FlightCamera = () => {
  const scroll = useScroll();
  const cameraRef = useRef();
  
  // Scroll sound effect
  React.useEffect(() => {
    if (!scroll.el) return;
    
    let scrollTimeout;
    let isScrolling = false;
    
    const handleScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
        playScrollSound();
      }
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 150);
    };
    
    scroll.el.addEventListener('scroll', handleScroll);
    return () => {
      scroll.el.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [scroll.el]);

  // Keyboard Navigation for Presentation Mode
  React.useEffect(() => {
    if (!scroll.el) return;
    
    const handleKeyDown = (e) => {
      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Space'].includes(e.code || e.key)) {
        const htmlContainer = document.querySelector('.glass-container');
        if (!htmlContainer) return;
        
        const slides = Array.from(htmlContainer.querySelectorAll('.slide'));
        if (slides.length === 0) return;

        const htmlScrollableHeight = htmlContainer.offsetHeight - window.innerHeight;
        const nativeScrollableHeight = scroll.el.scrollHeight - window.innerHeight;
        const ratio = htmlScrollableHeight > 0 ? htmlScrollableHeight / nativeScrollableHeight : 1;
        const currentHtmlOffset = scroll.el.scrollTop * ratio;
        
        let currentIndex = 0;
        let minDistance = Infinity;
        slides.forEach((slide, index) => {
          const distance = Math.abs(slide.offsetTop - currentHtmlOffset);
          if (distance < minDistance) {
            minDistance = distance;
            currentIndex = index;
          }
        });

        // ---- TESTIQO INTERACTIVE SEQUENCE (Slide Index 4) ----
        if (currentIndex === 4) {
          if (e.key === 'ArrowDown' && !window.testiqoActive) {
            e.preventDefault();
            window.testiqoActive = true;
            window.testiqoStep = 1;
            // Trigger Asteroid Strike!
            document.dispatchEvent(new Event('asteroidStrike'));
            return;
          }
          
          if (window.testiqoActive) {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              if (window.testiqoStep < 3) {
                window.testiqoStep++;
                document.dispatchEvent(new CustomEvent('updateTestiqoStep', { detail: window.testiqoStep }));
              }
              return;
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              if (window.testiqoStep > 1) {
                window.testiqoStep--;
                document.dispatchEvent(new CustomEvent('updateTestiqoStep', { detail: window.testiqoStep }));
              }
              return;
            } else if (e.key === 'ArrowDown') {
              // End sequence and move on to next slide naturally
              window.testiqoActive = false;
              window.testiqoStep = 0;
              document.dispatchEvent(new CustomEvent('updateTestiqoStep', { detail: 0 }));
              // DO NOT return, let normal ArrowDown proceed to scroll to slide 6
            }
          }
        }

        // ---- NORMAL NAVIGATION ----
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); // Stop native tiny scroll
          
          let targetIndex = currentIndex;
          let targetHtmlOffset = currentHtmlOffset;
          
          const currentSlide = slides[currentIndex];
          const slideTop = currentSlide.offsetTop;
          const slideBottom = slideTop + currentSlide.offsetHeight;
          
          if (e.key === 'ArrowDown') {
            if (currentHtmlOffset + window.innerHeight < slideBottom - 10) {
              targetHtmlOffset = Math.min(currentHtmlOffset + window.innerHeight, slideBottom - window.innerHeight);
            } else {
              targetIndex = Math.min(currentIndex + 1, slides.length - 1);
              targetHtmlOffset = slides[targetIndex].offsetTop;
            }
          } else if (e.key === 'ArrowUp') {
            if (currentHtmlOffset > slideTop + 10) {
              targetHtmlOffset = Math.max(currentHtmlOffset - window.innerHeight, slideTop);
            } else {
              targetIndex = Math.max(currentIndex - 1, 0);
              targetHtmlOffset = slides[targetIndex].offsetTop;
            }
          }
          
          const targetScrollTop = targetHtmlOffset / ratio;
          scroll.el.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        } else if (e.code === 'Space') {
        // Grab the actual HTML container that Drei translates
        const htmlContainer = document.querySelector('.glass-container');
        if (!htmlContainer) return;
        
        const slides = Array.from(htmlContainer.querySelectorAll('.slide'));
        if (slides.length === 0) return;

        const htmlScrollableHeight = htmlContainer.offsetHeight - window.innerHeight;
        const nativeScrollableHeight = scroll.el.scrollHeight - window.innerHeight;
        const ratio = htmlScrollableHeight > 0 ? htmlScrollableHeight / nativeScrollableHeight : 1;
        const currentHtmlOffset = scroll.el.scrollTop * ratio;
        
        let currentIndex = 0;
        let minDistance = Infinity;
        slides.forEach((slide, index) => {
          const distance = Math.abs(slide.offsetTop - currentHtmlOffset);
          if (distance < minDistance) {
            minDistance = distance;
            currentIndex = index;
          }
        });

        // Trigger Hyperspace Warp only if we are at the very last slide
        if (currentIndex === slides.length - 1 && !window.isWarping) {
          e.preventDefault();
          window.isWarping = true;
          window.warpProgress = 0;
          playScrollSound();
        }
      } // closes else if (e.code === 'Space')
    } // closes outer if (['ArrowDown', ...].includes(...))
  }; // closes handleKeyDown function
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [scroll.el]);

  useFrame((state, delta) => {
    if (window.isWarping) {
      if (window.warpProgress === undefined) window.warpProgress = 0;
      window.warpProgress += delta * 0.4; // Takes 2.5 seconds to warp through
      
      if (window.warpProgress <= 1.0) {
        // Hyperspace tunnel FOV effect: peaks at 140, then drops back
        const fovSpike = Math.sin(window.warpProgress * Math.PI) * 80;
        state.camera.fov = 60 + fovSpike;
        state.camera.updateProjectionMatrix();
        
        // Lerp from the END of the curve, straight through 0,0,0, and out to 0,0,-300
        const startPos = flightCurve.getPointAt(1);
        const endPos = new THREE.Vector3(0, 0, -300);
        
        // Use an ease-in cubic easing function so it accelerates violently into the black hole!
        const easeIn = window.warpProgress * window.warpProgress * window.warpProgress;
        
        state.camera.position.lerpVectors(startPos, endPos, easeIn);
        state.camera.lookAt(0, 0, -400); // Always look straight ahead through the tunnel
        
        // Wild spinning effect inside the accretion disk
        state.camera.rotation.z += window.warpProgress * delta * 5.0;
      } else {
        // Warp complete! Show tech stack.
        if (!window.warpDone) {
          window.warpDone = true;
          // Set camera exactly to end position and reset FOV and rotation
          state.camera.position.set(0, 0, -300);
          state.camera.lookAt(0, 0, -400);
          state.camera.fov = 60;
          state.camera.rotation.z = 0;
          state.camera.updateProjectionMatrix();
          
          document.dispatchEvent(new Event('showTechStackEvent'));
        }
      }
    } else if (window.reverseWarping) {
      // Reverse warp animation from the tech stack back to the end of the presentation
      if (window.warpProgress === undefined) window.warpProgress = 1.0;
      window.warpProgress -= delta * 0.6; // Slightly faster reverse
      
      if (window.warpProgress > 0) {
        // Reverse FOV effect
        const fovSpike = Math.sin(window.warpProgress * Math.PI) * 40;
        state.camera.fov = 60 + fovSpike;
        state.camera.updateProjectionMatrix();
        
        const startPos = flightCurve.getPointAt(1);
        const endPos = new THREE.Vector3(0, 0, -300);
        
        // Smooth ease out for reversing
        const easeOut = 1 - Math.pow(1 - window.warpProgress, 3);
        state.camera.position.lerpVectors(startPos, endPos, easeOut);
        
        // Steer the camera backward gracefully
        state.camera.lookAt(startPos.x, startPos.y + 10, startPos.z + 10);
      } else {
        // Finished reversing, hand control back to normal ScrollControls
        window.reverseWarping = false;
        window.isWarping = false;
        window.warpDone = false;
        state.camera.fov = 60;
        state.camera.updateProjectionMatrix();
      }
    } else {
      // scroll.offset can sometimes exceed 1.0 on aggressive scroll bounces.
      // We clamp the position offset to 0.98 max so the lookAtPoint can always be strictly ahead (at 1.0).
      // If position and lookAt are the exact same point, the camera orientation breaks!
      const tPos = Math.max(0, Math.min(0.98, scroll.offset));
      
      // Get position on curve
      const position = flightCurve.getPointAt(tPos);
      state.camera.position.copy(position);
      
      // Look slightly ahead on the curve to steer
      const lookAtPoint = flightCurve.getPointAt(tPos + 0.02);
      state.camera.lookAt(lookAtPoint);
      
      // Add mouse parallax for extra immersion
      state.camera.rotation.x += (state.pointer.y * Math.PI) / 32;
      state.camera.rotation.y += -(state.pointer.x * Math.PI) / 32;
    }
  });

  return null;
};

// --------------------------------------------------------
// 3. MAIN APP
// --------------------------------------------------------
const App = () => {
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showTechStack, setShowTechStack] = useState(false);
  const [testiqoStep, setTestiqoStep] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  
  React.useEffect(() => {
    const handleShowTechStack = () => setShowTechStack(true);
    document.addEventListener('showTechStackEvent', handleShowTechStack);
    return () => document.removeEventListener('showTechStackEvent', handleShowTechStack);
  }, []);

  // Listeners for TestiQo sequence
  React.useEffect(() => {
    const handleUpdateStep = (e) => setTestiqoStep(e.detail);
    const handleFlash = () => {
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 500); // flash duration
    };
    
    document.addEventListener('updateTestiqoStep', handleUpdateStep);
    document.addEventListener('triggerWhiteFlash', handleFlash);
    
    return () => {
      document.removeEventListener('updateTestiqoStep', handleUpdateStep);
      document.removeEventListener('triggerWhiteFlash', handleFlash);
    };
  }, []);
  
  const handleReturnWarp = () => {
    setShowTechStack(false);
    window.reverseWarping = true;
    window.warpProgress = 1.0;
  };

  // Initialize background audio on first click or keypress
  React.useEffect(() => {
    const handleFirstInteraction = () => {
      startBackgroundAudio();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Track mouse position for the glitter glow effect on sub-text
  React.useEffect(() => {
    const handleMouseMove = (e) => {
      // Find all subtext elements (paragraphs and list items inside cards)
      const glowElements = document.querySelectorAll('.glass-card p, .glass-card li');
      glowElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Calculate mouse position relative to the element
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const [teamImageSrc, setTeamImageSrc] = useState("/phoenix-team.jpg");

  // Preload image aggressively into RAM using a Blob URL to guarantee 0ms pop-in
  React.useEffect(() => {
    fetch("/phoenix-team.jpg")
      .then(res => res.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        setTeamImageSrc(objectUrl);
      })
      .catch(e => console.error("Failed to preload image to RAM", e));
      
    // Cleanup to prevent memory leaks if component unmounts
    return () => {
      if (teamImageSrc.startsWith("blob:")) {
        URL.revokeObjectURL(teamImageSrc);
      }
    };
  }, []);

  return (
    <div className="app-container">
      {/* HTML Overlay for Team Phoenix Modal */}
      {showTeamModal && (
        <div className="team-modal">
          <div className="team-modal-content">
            <button className="close-btn-top-right" onClick={() => setShowTeamModal(false)}>✕</button>
            <h2 className="phoenix-title">PHOENIX</h2>
             {/* The user will drop phoenix-team.jpg into /public */}
            <img 
              src={teamImageSrc} 
              alt="Phoenix Team Dinner" 
              className="team-photo"
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = "https://via.placeholder.com/800x400/E51D34/FFFFFF?text=Please+add+phoenix-team.jpg+to+the+public+folder";
              }} 
            />
          </div>
        </div>
      )}

      {/* Real 3D Cinematic Engine */}
      <Canvas camera={{ position: [0, 40, 200], fov: 60 }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.1} />
        <directionalLight position={[100, 100, 100]} intensity={2.5} color="#ffffff" />
        <directionalLight position={[-100, -100, -50]} intensity={0.5} color="#556677" />
        
        {/* Post-Processing for massive Glow/Bloom */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2} />
        </EffectComposer>

        {/* Majestic particle background (Reduced count for performance) */}
        <Stars radius={150} depth={50} count={2000} factor={6} saturation={0} fade speed={2} />
        
        {/* The Black Hole Accretion Disk */}
        <AccretionDisk />

        {/* Slow moving ambient Asteroids */}
        <Asteroids />

        {/* Asteroid Strike Animation */}
        <AsteroidStrike />

        {/* Set exactly to pages={9} because 7 slides + 30vh gaps + padding = 900vh total height! */}
        <ScrollControls pages={9} damping={0.1}>
          <FlightCamera />
          
          {/* 
            The Interactive Phoenix Comet 
            CometManager isolates the interval state so the whole app doesn't re-render!
          */}
          <CometManager onClick={() => setShowTeamModal(true)} />

          {/* HTML Glassmorphic Overlay */}
          <Scroll html style={{ width: '100vw' }}>
            <div className="glass-container">
              
              {/* Slide 1 */}
              <div className="slide">
                <div className="glass-card">
                  <div className="badge">INTRO</div>
                  <h1>Pruthvi Velani <span style={{ fontSize: '0.5em' }}>CE(2026), VGEC</span></h1>
                  <h2>Final Internship Evaluation</h2>
                  <p>Welcome! Today we are taking a journey through my internship experience at 7Span.</p>
                  <p><strong>Agenda:</strong></p>
                  <ul>
                    <li>The Interview & 15-Day Orientation</li>
                    <li>What I Became</li>
                    <li>Training with the PHOENIX Team</li>
                    <li>Deep Dive into Project TestiQo</li>
                    <li>Frontend Engineering & API Integrations</li>
                    <li>Q&A</li>
                  </ul>
                </div>
              </div>

              {/* Slide 2 */}
              <div className="slide right-align">
                <div className="glass-card">
                  <div className="badge">THE BEGINNING</div>
                  <h1>My Journey at 7Span</h1>
                  <p>It started with the placement interview. I only knew basic OOPs and patterns, but they saw my potential.</p>
                  <p>I went through the comprehensive 15-day orientation session where I learned the culture, expectations, and the standards of the company.</p>
                </div>
              </div>

              {/* Slide 3 */}
              <div className="slide">
                <div className="glass-card">
                  <div className="badge">PERSONAL GROWTH</div>
                  <h1>What I Became</h1>
                  <p>At the beginning, I didn't know correctly the BASICS. Now, I proudly say I know significantly more than I did 6 months ago.</p>
                  <ul>
                    <li><strong>Problem Solving:</strong> The era is different, AI writes the code. I am much faster at solving problems because I know <em>what's next</em>, <em>why</em>, and <em>how</em>.</li>
                    <li><strong>Database Mastery:</strong> Thoroughly understand DB structure, Joins, Group By, Primary and Foreign Keys.</li>
                    <li><strong>The "Why":</strong> I learned to ask "why" or "why not this instead of that". Understanding the core problem first makes the actual implementation effortless via a single prompt.</li>
                  </ul>
                  <p>Thank you to Akshay, my mentors, and the entire Phoenix team for making me better than before.</p>
                </div>
              </div>

              {/* Slide 4 */}
              <div className="slide right-align">
                <div className="glass-card">
                  <div className="badge">PHOENIX TEAM</div>
                  <h1>Mastering Java & Beyond</h1>
                  <p>Assigned to the <strong>PHOENIX (Java)</strong> department.</p>
                  <p>Mentored by <strong>Het</strong> and <strong>Arham</strong>. Excellently guided by Team Leads <strong>Jeemy</strong> and <strong>Vaibhav</strong>.</p>
                  <ul>
                    <li>Leveled up from knowing almost nothing to mastering Java OOPs, HTML, CSS, React, and SpringBoot.</li>
                    <li>Cleared 2-3 rigorous evaluation tests.</li>
                    <li>Successfully developed a Student Marks Entry System that generates subject-wise results.</li>
                  </ul>
                </div>
              </div>

              {/* Slide 5 */}
              <div className="slide">
                <div className="glass-card">
                  <div className="badge">THE PRODUCT</div>
                  <h1>Project: TestiQo</h1>
                  <p>TestiQo is 7Span's incredibly powerful in-house product designed for safely and seamlessly conducting proctored examination drives.</p>
                  <p>It features an intuitive UI/UX built on top of a highly scalable, multi-microservices architecture.</p>
                </div>
              </div>

              {/* Slide 6 */}
              <div className="slide right-align">
                <div className="glass-card">
                  <div className="badge">PHASE 3 UI</div>
                  <h1>Engineering Contributions</h1>
                  <p><strong>The Monaco Editor:</strong> Built a powerful, reusable Code Editor component using the Monaco library (the engine behind VS Code).</p>
                  <p><strong>Assessment Linking:</strong> Built a complex tab integrating Job Roles and Experience to link Registration Forms with Assessments.</p>
                  <ul>
                    <li>Consumed `fetch job roles` and `fetch registration forms` APIs.</li>
                    <li>Implemented POST API to link combinations to an Assessment ID.</li>
                    <li>Implemented UNLINK functionality for safe deletions.</li>
                    <li>Implemented GET APIs to fetch candidates dynamically based on specific combinations.</li>
                  </ul>
                </div>
              </div>

              {/* Slide 7 */}
              <div className="slide center-align">
                <div className="glass-card">
                  <div className="badge">FINALE</div>
                  <h1>Q & A</h1>
                  <h2>Any Questions?</h2>
                </div>
              </div>

            </div>
          </Scroll>
        </ScrollControls>
      </Canvas>
      
      {/* CSS Screen Flash Effect */}
      <div className={`screen-flash ${flashActive ? 'active' : ''}`}></div>

      {/* TestiQo Image Carousel Modal */}
      {testiqoStep > 0 && (
        <div className="testiqo-carousel-modal fadeInUp">
          <div className="carousel-content">
            {testiqoStep === 1 && (
              <img src="/code-editor.png" alt="Monaco Code Editor" className="carousel-img" />
            )}
            {testiqoStep === 2 && (
              <img src="/Link-registrationForm.png" alt="Link Registration Form" className="carousel-img" />
            )}
            {testiqoStep === 3 && (
              <img src="/feedback&logsCard.png" alt="Feedback Logs" className="carousel-img" />
            )}
            
            <div className="carousel-controls">
              {testiqoStep > 1 ? <span className="arrow-hint">← Prev</span> : <span></span>}
              <span className="step-indicator">Step {testiqoStep} / 3</span>
              {testiqoStep < 3 ? <span className="arrow-hint">Next →</span> : <span className="arrow-hint down">↓ Continue</span>}
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden Behind-the-Scenes Tech Stack Card triggered by Warp */}
      {showTechStack && (
        <div className="tech-stack-modal fadeInUp">
          <div className="glass-card tech-stack-card">
            <div className="badge" style={{ backgroundColor: '#ff2a46' }}>BEHIND THE SCENES</div>
            <h1 style={{ color: '#ff2a46', textShadow: '0 0 20px rgba(255,42,70,0.8)' }}>
              How This Was Built
            </h1>
            <p>This entire cinematic presentation is built natively in the browser without video files.</p>
            <ul>
              <li><strong>Core Engine:</strong> React Three Fiber & Three.js</li>
              <li><strong>Visuals:</strong> Continuous Mathematical Noise, Bloom HDR Post-Processing, Glassmorphism CSS</li>
              <li><strong>Physics:</strong> Euler Velocity Integration (Spring Gravity & Mouse Repulsion wakes)</li>
              <li><strong>Performance:</strong> InstancedMesh geometry (300 High-Poly Asteroids drawn in 1 draw call)</li>
            </ul>
            
            <button className="close-btn" style={{ marginTop: '2rem', width: '100%' }} onClick={handleReturnWarp}>
              Initiate Reverse Warp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
