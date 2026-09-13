import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Sphere, Box, Torus, Cone } from "@react-three/drei";
import * as THREE from "three";

interface Scene3DProps {
  type: "sphere" | "box" | "torus" | "cone";
  color: string;
  scrollProgress: number;
}

const Scene3D: React.FC<Scene3DProps> = ({ type, color, scrollProgress }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x = scrollProgress * Math.PI * 2;
      meshRef.current.rotation.y = scrollProgress * Math.PI * 2;
      meshRef.current.position.x = Math.sin(scrollProgress * Math.PI) * 2;
    }
  });

  const renderShape = () => {
    switch (type) {
      case "sphere":
        return (
          <Sphere ref={meshRef} args={[1, 32, 32]}>
            <meshStandardMaterial
              color={color}
              metalness={0.8}
              roughness={0.2}
            />
          </Sphere>
        );
      case "box":
        return (
          <Box ref={meshRef} args={[1.5, 1.5, 1.5]}>
            <meshStandardMaterial
              color={color}
              metalness={0.6}
              roughness={0.3}
            />
          </Box>
        );
      case "torus":
        return (
          <Torus ref={meshRef} args={[1, 0.4, 16, 100]}>
            <meshStandardMaterial
              color={color}
              metalness={0.7}
              roughness={0.25}
            />
          </Torus>
        );
      case "cone":
        return (
          <Cone ref={meshRef} args={[1, 2, 32]}>
            <meshStandardMaterial
              color={color}
              metalness={0.5}
              roughness={0.4}
            />
          </Cone>
        );
      default:
        return null;
    }
  };

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      {renderShape()}
    </Float>
  );
};

export default Scene3D;
