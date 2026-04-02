import React, { useRef, useEffect, useMemo } from 'react';
import { useFBX, useAnimations } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three-stdlib';
import * as THREE from 'three';

interface Ben10ModelProps {
  isTalking: boolean;
  modelUrl: string | null;
  modelType: 'fbx' | 'obj';
  textureUrl: string | null;
  flipY?: boolean;
  triggerWave?: boolean;
}

export const Ben10Model = ({ isTalking, modelUrl, modelType, textureUrl, flipY = true, triggerWave }: Ben10ModelProps) => {
  const fbx = modelType === 'fbx' && modelUrl ? useFBX(modelUrl) : null;
  const obj = modelType === 'obj' && modelUrl ? useLoader(OBJLoader, modelUrl) : null;
  const texture = textureUrl ? useLoader(THREE.TextureLoader, textureUrl) : null;

  const model = fbx || obj;

  // useAnimations returns { actions, clips, mixer, names, ref }
  const { actions, names } = useAnimations(fbx?.animations || [], model || undefined);

  useEffect(() => {
    if (triggerWave && actions) {
      // Try common animation names for waving
      const waveName = names.find(n => 
        n.toLowerCase().includes('wave') || 
        n.toLowerCase().includes('hello') || 
        n.toLowerCase().includes('greet')
      );
      
      if (waveName && actions[waveName]) {
        const action = actions[waveName];
        action.reset().setLoop(THREE.LoopOnce, 1).play();
        action.clampWhenFinished = true;
      }
    }
  }, [triggerWave, actions, names]);

  useEffect(() => {
    if (model && texture) {
      texture.flipY = flipY;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const applyTexture = (mat: THREE.Material) => {
              if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
                mat.map = texture;
                mat.needsUpdate = true;
              }
            };

            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(applyTexture);
            } else {
              applyTexture(mesh.material);
            }
          }
        }
      });
    }
  }, [model, texture, flipY]);

  useEffect(() => {
    if (actions && names.length > 0) {
      const idleAction = actions[names[0]];
      if (idleAction) {
        idleAction.reset().fadeIn(0.5).play();
      }
    }
  }, [actions, names]);

  useEffect(() => {
    if (isTalking && actions && names.includes('talking')) {
      actions['talking']?.reset().fadeIn(0.2).play();
    } else if (actions && names.includes('talking')) {
      actions['talking']?.fadeOut(0.2);
    }
  }, [isTalking, actions, names]);

  if (!model) {
    return (
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshStandardMaterial color="#00ff00" wireframe />
      </mesh>
    );
  }

  // Auto-scale and center the model (Focus on Head)
  useEffect(() => {
    if (model) {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 5 / maxDim; // Slightly larger scale
      model.scale.setScalar(scale);
      
      const center = box.getCenter(new THREE.Vector3());
      // Position so the face (roughly 75% up the model) is centered
      // We center X and Z, but adjust Y to bring the head to the middle
      const headYOffset = size.y * 0.35; // Offset from center to head
      model.position.set(
        -center.x * scale, 
        (-center.y - headYOffset) * scale, 
        -center.z * scale
      );
    }
  }, [model]);

  return (
    <primitive 
      object={model} 
      rotation={[0, Math.PI, 0]}
    />
  );
};
