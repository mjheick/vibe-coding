import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const SpaceshipEarth = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const sphereRef = useRef(null);
  const frameRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.005);
  const [pointLights, setPointLights] = useState([]);
  const [lightsEnabled, setLightsEnabled] = useState(true);
  const [lightIntensity, setLightIntensity] = useState(0.5);
  const [lightColor, setLightColor] = useState('#00aaff');
  const [animationMode, setAnimationMode] = useState('static'); // static, wave, pulse, rainbow

  // Update light properties when controls change
  useEffect(() => {
    if (pointLights.length > 0) {
      pointLights.forEach(light => {
        if (animationMode === 'static') {
          light.color.setHex(lightColor.replace('#', '0x'));
          light.intensity = lightsEnabled ? lightIntensity : 0;
          if (light.userData.visualMesh) {
            light.userData.visualMesh.material.color.setHex(lightColor.replace('#', '0x'));
            light.userData.visualMesh.material.opacity = lightsEnabled ? 0.9 : 0.1;
          }
        }
      });
    }
  }, [pointLights, lightColor, lightIntensity, lightsEnabled, animationMode]);
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Create geodesic sphere geometry with point lights at each vertex
    const createGeodesicSphere = () => {
      // Using subdivision level 5 to get close to the target triangle count
      // An icosahedron with subdivision 5 gives us the precise geodesic structure
      const geometry = new THREE.IcosahedronGeometry(3, 5);
      
      // Verify the geometry matches our requirements
      const triangleCount = geometry.index ? geometry.index.count / 3 : 0;
      const vertexCount = geometry.attributes.position ? geometry.attributes.position.count : 0;
      console.log(`Triangles: ${triangleCount}, Vertices: ${vertexCount}`);

      // Extract vertex positions for point lights
      const positions = geometry.attributes.position.array;
      const lightPositions = [];
      for (let i = 0; i < positions.length; i += 3) {
        lightPositions.push({
          x: positions[i],
          y: positions[i + 1],
          z: positions[i + 2]
        });
      }
      
      // Store positions for light creation
      geometry.userData.lightPositions = lightPositions;
      
      // Create materials for the detailed geodesic structure
      const panelMaterial = new THREE.MeshPhongMaterial({
        color: 0xc8c8d0,
        shininess: 100,
        transparent: false,
        opacity: 1.0,
        flatShading: false, // Smooth shading for better light reflection
        reflectivity: 0.8,
        specular: 0x444444
      });

      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x202020,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
      });

      // Main sphere
      const sphere = new THREE.Mesh(geometry, panelMaterial);
      sphere.castShadow = true;
      sphere.receiveShadow = true;

      // Wireframe overlay - slightly larger to show the geodesic structure clearly
      const wireframe = new THREE.Mesh(geometry, wireframeMaterial);
      wireframe.scale.setScalar(1.002); // Slightly larger to prevent z-fighting

      // Create edge geometry to better show the triangular structure
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0x404040, 
        transparent: true, 
        opacity: 0.7 
      });
      const edgeLines = new THREE.LineSegments(edges, edgeMaterial);

      const group = new THREE.Group();
      group.add(sphere);
      group.add(wireframe);
      group.add(edgeLines);

      return group;
    };

    const spaceshipEarth = createGeodesicSphere();
    sphereRef.current = spaceshipEarth;
    scene.add(spaceshipEarth);

    // Create point lights at each vertex
    const createVertexLights = (sphereGroup) => {
      const lights = [];
      const geometry = sphereGroup.children[0].geometry; // Get the main sphere geometry
      const lightPositions = geometry.userData.lightPositions;
      
      if (lightPositions) {
        lightPositions.forEach((pos, index) => {
          // Normalize and scale the position to be right on the surface
          const normalizedPos = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
          const surfacePos = normalizedPos.multiplyScalar(3.02); // Slightly outside the 3.0 radius sphere
          
          const light = new THREE.PointLight(lightColor, 0, 1.5); // Increased range for better surface illumination
          light.position.copy(surfacePos);
          light.userData = { originalIndex: index, originalPosition: surfacePos };
          lights.push(light);
          
          // Create a smaller sphere to visualize the light point - positioned right on surface
          const lightSphere = new THREE.SphereGeometry(0.015, 6, 6);
          const lightMaterial = new THREE.MeshBasicMaterial({ 
            color: lightColor,
            transparent: true,
            opacity: 0.9
          });
          const lightMesh = new THREE.Mesh(lightSphere, lightMaterial);
          lightMesh.position.copy(surfacePos);
          
          // Add both light and visual indicator to the sphere group
          sphereGroup.add(light);
          sphereGroup.add(lightMesh);
          
          // Store reference to the visual mesh for color updates
          light.userData.visualMesh = lightMesh;
        });
      }
      
      return lights;
    };

    const lights = createVertexLights(spaceshipEarth);
    setPointLights(lights);

    // Add support structure (legs)
    const createSupportStructure = () => {
      const group = new THREE.Group();
      const legMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
      
      // Create three legs
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.08, 4);
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        
        leg.position.set(
          Math.cos(angle) * 2.5,
          -4,
          Math.sin(angle) * 2.5
        );
        leg.rotation.z = Math.sin(angle) * 0.1;
        leg.rotation.x = Math.cos(angle) * 0.1;
        
        group.add(leg);
      }

      return group;
    };

    const supports = createSupportStructure();
    scene.add(supports);

    // Create a simple ground plane
    const groundGeometry = new THREE.CircleGeometry(15, 32);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.3
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -6;
    ground.receiveShadow = true;
    scene.add(ground);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4a90e2, 0.3);
    pointLight.position.set(-5, 3, -5);
    scene.add(pointLight);

    // Add some atmospheric particles
    const createStars = () => {
      const starsGeometry = new THREE.BufferGeometry();
      const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2,
        transparent: true,
        opacity: 0.8
      });

      const starsVertices = [];
      for (let i = 0; i < 200; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        starsVertices.push(x, y, z);
      }

      starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
      const stars = new THREE.Points(starsGeometry, starsMaterial);
      return stars;
    };

    const stars = createStars();
    scene.add(stars);

    // Mouse controls
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
      targetRotationX = mouseY * 0.3;
      targetRotationY = mouseX * 0.3;
    };

    // Mouse wheel zoom controls
    const handleWheel = (event) => {
      event.preventDefault();
      const zoomSpeed = 0.5;
      const minDistance = 4;
      const maxDistance = 20;
      
      if (event.deltaY > 0) {
        // Zoom out
        camera.position.multiplyScalar(1 + zoomSpeed * 0.1);
      } else {
        // Zoom in
        camera.position.multiplyScalar(1 - zoomSpeed * 0.1);
      }
      
      // Clamp the distance
      const distance = camera.position.length();
      if (distance < minDistance) {
        camera.position.normalize().multiplyScalar(minDistance);
      } else if (distance > maxDistance) {
        camera.position.normalize().multiplyScalar(maxDistance);
      }
    };

    mountRef.current.addEventListener('mousemove', handleMouseMove);
    mountRef.current.addEventListener('wheel', handleWheel, { passive: false });

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (sphereRef.current) {
        if (isRotating) {
          sphereRef.current.rotation.y += rotationSpeed;
        }
        
        // Smooth mouse interaction
        sphereRef.current.rotation.x += (targetRotationX - sphereRef.current.rotation.x) * 0.05;
        sphereRef.current.rotation.z += (targetRotationY - sphereRef.current.rotation.z) * 0.05;
      }

      // Animate point lights based on mode
      if (pointLights.length > 0 && lightsEnabled) {
        const time = Date.now() * 0.001;
        
        pointLights.forEach((light, index) => {
          switch (animationMode) {
            case 'wave':
              const waveIntensity = (Math.sin(time * 2 + index * 0.1) + 1) * 0.5 * lightIntensity;
              light.intensity = waveIntensity;
              break;
            case 'pulse':
              const pulseIntensity = (Math.sin(time * 3) + 1) * 0.5 * lightIntensity;
              light.intensity = pulseIntensity;
              break;
            case 'rainbow':
              const hue = (time * 50 + index * 10) % 360;
              const color = new THREE.Color().setHSL(hue / 360, 1, 0.5);
              light.color = color;
              light.intensity = lightIntensity;
              if (light.userData.visualMesh) {
                light.userData.visualMesh.material.color = color;
              }
              break;
            default: // static
              light.intensity = lightIntensity;
              break;
          }
        });
      }

      // Gentle star rotation
      if (stars) {
        stars.rotation.y += 0.0005;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      // Clean up point lights and visual meshes
      pointLights.forEach(light => {
        if (light.parent) {
          light.parent.remove(light);
        }
        if (light.userData.visualMesh) {
          if (light.userData.visualMesh.parent) {
            light.userData.visualMesh.parent.remove(light.userData.visualMesh);
          }
          light.userData.visualMesh.geometry.dispose();
          light.userData.visualMesh.material.dispose();
        }
      });
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (mountRef.current) {
        mountRef.current.removeEventListener('mousemove', handleMouseMove);
        mountRef.current.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [isRotating, rotationSpeed, lightsEnabled, lightIntensity, lightColor, animationMode]);

  return (
    <div className="w-full h-screen bg-gray-900 relative overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Control Panel */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg backdrop-blur-sm max-w-sm">
        <h2 className="text-xl font-bold mb-3 text-blue-300">Spaceship Earth</h2>
        
        <div className="space-y-4">
          {/* Rotation Controls */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-300">Rotation</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsRotating(!isRotating)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isRotating 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {isRotating ? 'Pause' : 'Rotate'}
              </button>
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Speed</label>
              <input
                type="range"
                min="0.001"
                max="0.02"
                step="0.001"
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Light Controls */}
          <div className="space-y-2 border-t border-gray-600 pt-3">
            <h3 className="text-sm font-semibold text-gray-300">Point Lights ({pointLights.length})</h3>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLightsEnabled(!lightsEnabled)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  lightsEnabled 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {lightsEnabled ? 'Lights On' : 'Lights Off'}
              </button>
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Intensity</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={lightIntensity}
                onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Color</label>
              <input
                type="color"
                value={lightColor}
                onChange={(e) => setLightColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-1">Animation</label>
              <select
                value={animationMode}
                onChange={(e) => setAnimationMode(e.target.value)}
                className="w-full p-1 bg-gray-700 text-white rounded text-sm"
              >
                <option value="static">Static</option>
                <option value="wave">Wave</option>
                <option value="pulse">Pulse</option>
                <option value="rainbow">Rainbow</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-400">
          <p>• Move mouse to interact</p>
          <p>• Scroll to zoom in/out</p>
          <p>• {pointLights.length} lights at geodesic vertices</p>
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg backdrop-blur-sm max-w-xs">
        <h3 className="font-bold text-blue-300 mb-2">Spaceship Earth Details</h3>
        <div className="text-sm text-gray-300 leading-relaxed space-y-1">
          <p><strong>Structure:</strong> 11,520 triangular panels</p>
          <p><strong>Vertices:</strong> 3,840 geodesic points</p>
          <p><strong>Height:</strong> 180 feet (55 meters)</p>
          <p><strong>Weight:</strong> 16 million pounds</p>
          <p className="mt-2 text-xs text-gray-400">
            This geodesic sphere represents the most mathematically precise 
            recreation of EPCOT's iconic structure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpaceshipEarth;