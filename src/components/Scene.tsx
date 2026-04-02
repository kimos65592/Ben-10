import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, MeshDistortMaterial, Sphere, Stars, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Ben10Model } from './Ben10Model';

const OmnitrixCore = ({ isListening, isTalking }: { isListening: boolean; isTalking: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      if (isTalking) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
        meshRef.current.scale.set(scale, scale, scale);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.005;
      ringRef.current.rotation.x += 0.002;
    }
  });

  return (
    <group position={[0, 2, -2]}>
      {/* Central Core */}
      <Sphere ref={meshRef} args={[0.5, 64, 64]}>
        <MeshDistortMaterial
          color={isListening ? "#00ff00" : isTalking ? "#00ff88" : "#004400"}
          speed={isListening ? 5 : 2}
          distort={isListening ? 0.4 : 0.2}
          roughness={0}
          metalness={1}
          emissive={isListening ? "#00ff00" : isTalking ? "#00ff88" : "#002200"}
          emissiveIntensity={isListening ? 2 : 1}
        />
      </Sphere>

      {/* Decorative Rings */}
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.01, 16, 100]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} />
        </mesh>
      </group>
    </group>
  );
};

export const Scene = ({ isListening, isTalking, modelUrl, modelType, textureUrl, flipTextureY, triggerWave }: { 
  isListening: boolean; 
  isTalking: boolean;
  modelUrl: string | null;
  modelType: 'fbx' | 'obj';
  textureUrl: string | null;
  flipTextureY: boolean;
  triggerWave: boolean;
}) => {
  return (
    <div className="w-full h-full bg-black">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        <OrbitControls enablePan={false} enableZoom={true} minDistance={5} maxDistance={20} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#00ff00" castShadow />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2.5} color="#00ff00" />
        
        <Suspense fallback={null}>
          <group position={[0, 0, 0]}>
            <Ben10Model 
              isTalking={isTalking} 
              modelUrl={modelUrl} 
              modelType={modelType} 
              textureUrl={textureUrl} 
              flipY={flipTextureY} 
              triggerWave={triggerWave}
            />
          </group>
        </Suspense>

        <ContactShadows opacity={0.4} scale={10} blur={2} far={4.5} color="#00ff00" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="night" />
      </Canvas>
    </div>
  );
};

