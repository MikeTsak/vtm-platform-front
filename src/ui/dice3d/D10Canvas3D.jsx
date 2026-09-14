// src/ui/dice3d/D10Canvas3D.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { sharedDiceEngine } from './sharedDiceEngine';

export default function D10Canvas3D({
  value = 1,
  isHunger = false,
  isRolling = false,
  size = 'md',
  index = 0,
  onFallback,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const width = size === 'sm' ? 44 : size === 'lg' ? 120 : 80;
  const height = size === 'sm' ? 48 : size === 'lg' ? 130 : 88;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const canvasW = Math.round(width * dpr);
  const canvasH = Math.round(height * dpr);

  useEffect(() => {
    const isSupported = sharedDiceEngine.init();
    if (!isSupported) {
      if (onFallback) onFallback();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetQuat = sharedDiceEngine.getTargetRotation();
    const seed = (index * 17) % 100;
    const signX = (index % 2 === 0 ? 1 : -1);
    const signY = (index % 3 === 0 ? 1 : -1);

    const angularVelocity = new THREE.Vector3(
      signX * (14 + (seed % 6)),
      signY * (16 + ((seed * 3) % 7)),
      (signX * signY) * (10 + (seed % 5))
    );

    const currentQuat = targetQuat.clone();
    // Start with randomized orientation
    currentQuat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(
      (seed % 360) * Math.PI / 180,
      ((seed * 7) % 360) * Math.PI / 180,
      ((seed * 13) % 360) * Math.PI / 180
    )));

    let startTime = performance.now();
    let lastTime = startTime;
    const totalDuration = 700; // ms

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDuration);
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      let scaleX = 1;
      let scaleY = 1;
      let scaleZ = 1;
      let posY = 0;

      if (progress < 0.72) {
        // Tumbling & height arc phase
        const deltaEuler = new THREE.Euler(
          angularVelocity.x * delta,
          angularVelocity.y * delta,
          angularVelocity.z * delta
        );
        const deltaQuat = new THREE.Quaternion().setFromEuler(deltaEuler);
        currentQuat.multiply(deltaQuat);

        const heightProgress = progress / 0.72;
        posY = Math.sin(heightProgress * Math.PI) * 0.45;
        const liftScale = 1 + Math.sin(heightProgress * Math.PI) * 0.12;
        scaleX = liftScale;
        scaleY = liftScale;
        scaleZ = liftScale;
      } else {
        // Alignment slerp towards camera vector
        const settleProgress = (progress - 0.72) / 0.28;
        const ease = 1 - Math.pow(1 - settleProgress, 3);
        currentQuat.slerp(targetQuat, 0.18 + ease * 0.35);

        // Landing impact squash
        if (settleProgress < 0.4) {
          const squash = 1 - Math.sin(settleProgress * Math.PI * 2.5) * 0.08;
          scaleX = 1.08;
          scaleY = squash;
          scaleZ = 1.08;
          posY = -0.05 * (1 - settleProgress);
        } else {
          scaleX = 1;
          scaleY = 1;
          scaleZ = 1;
          posY = 0;
        }
      }

      sharedDiceEngine.renderDieToContext(ctx, canvasW, canvasH, {
        value,
        isHunger,
        quaternion: progress >= 1 ? targetQuat : currentQuat,
        scaleX,
        scaleY,
        scaleZ,
        posY,
      });

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, isHunger, isRolling, index, canvasW, canvasH]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}
