import { useReducer, useEffect, useRef, useDeferredValue, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STORAGE_KEY, DEFAULTS, COUNTERSINK_DEPTH, SHOW_OUTLINE, BOARD_RADIUS } from './constants';
import { buildBoardShape, generateBinarySTLBlob } from './board';
import { Slider, Checkbox, SectionBox, Logo, DownloadIcon } from './components';

const loadSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

type State = {
  width: number;
  height: number;
  thickness: number;
  withMountingHoles: boolean;
  screwHoleDiameter: number;
  screwHoleInset: number;
  extendTop: boolean;
  extendBottom: boolean;
  extendLeft: boolean;
  extendRight: boolean;
  roundTopLeft: boolean;
  roundTopRight: boolean;
  roundBottomLeft: boolean;
  roundBottomRight: boolean;
};

const reducer = (state: State, action: Partial<State>): State => ({
  ...state,
  ...action,
});

const SkadisGenerator = () => {
  const saved = loadSettings();
  const [state, dispatch] = useReducer(reducer, saved ? { ...DEFAULTS, ...saved } : { ...DEFAULTS });
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('skraeddar_dark') === 'true'; }
    catch { return false; }
  });
  const { width, height, thickness, withMountingHoles, screwHoleDiameter, screwHoleInset,
    extendTop, extendBottom, extendLeft, extendRight,
    roundTopLeft, roundTopRight, roundBottomLeft, roundBottomRight } = state;
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const geometryRef = useRef<THREE.ExtrudeGeometry | null>(null);

  const deferredWidth = useDeferredValue(state.width);
  const deferredHeight = useDeferredValue(state.height);
  const deferredThickness = useDeferredValue(state.thickness);
  const deferredScrewHoleDiameter = useDeferredValue(state.screwHoleDiameter);
  const deferredScrewHoleInset = useDeferredValue(state.screwHoleInset);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('skraeddar_dark', String(darkMode)); }
    catch { /* noop */ }
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(darkMode ? 0x1a1a2e : 0xf5f5f5);
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x1a1a2e : 0xf5f5f5);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      3000
    );
    const maxDim = Math.max(width, height);
    camera.position.set(maxDim * 0.7, maxDim * 0.7, maxDim * 1.5);
    camera.lookAt(width / 2, height / 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(width / 2, height / 2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.minDistance = 50;
    controls.maxDistance = 3000;
    controls.update();
    controlsRef.current = controls;

    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current || !controlsRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;

      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
      controlsRef.current.update();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const width = deferredWidth;
    const height = deferredHeight;
    const thickness = deferredThickness;
    const screwHoleDiameter = deferredScrewHoleDiameter;
    const screwHoleInset = deferredScrewHoleInset;

    if (!sceneRef.current) return;

    sceneRef.current.children.forEach(child => {
      if (child.type !== 'AmbientLight' && child.type !== 'DirectionalLight') {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          child.material.dispose();
        }
      }
    });
    sceneRef.current.children = sceneRef.current.children.filter(
      (child: THREE.Object3D) => child.type === 'AmbientLight' || 
               child.type === 'DirectionalLight'
    );

    const { shape, totalHoles } = buildBoardShape({
      width, height, withMountingHoles, screwHoleDiameter, screwHoleInset,
      extendTop, extendBottom, extendLeft, extendRight,
      roundTopLeft, roundTopRight, roundBottomLeft, roundBottomRight
    });

    const extrudeSettings = {
      steps: 1,
      depth: thickness,
      bevelEnabled: false
    };

    const boardGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometryRef.current = boardGeometry;
    const boardMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x595959,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.FrontSide
    });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.set(width / 2, height / 2, 0);
    board.rotation.x = 0;
    board.userData = { totalHoles };
    sceneRef.current.add(board);

    if (SHOW_OUTLINE) {
      const outlinePoints = [];
      const outlineRadius = BOARD_RADIUS;
      const segments = 16;

      const bl = roundBottomLeft;
      const br = roundBottomRight;
      const tr = roundTopRight;
      const tl = roundTopLeft;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const xStart = -width/2 + (bl ? outlineRadius : 0);
        const xEnd = width/2 - (br ? outlineRadius : 0);
        outlinePoints.push(new THREE.Vector3(xStart + t * (xEnd - xStart), -height/2, 0));
      }
      if (br) {
        for (let i = 0; i <= segments; i++) {
          const angle = -Math.PI/2 + (i / segments) * Math.PI/2;
          outlinePoints.push(new THREE.Vector3(
            width/2 - outlineRadius + Math.cos(angle) * outlineRadius,
            -height/2 + outlineRadius + Math.sin(angle) * outlineRadius,
            0
          ));
        }
      }
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const yStart = -height/2 + (br ? outlineRadius : 0);
        const yEnd = height/2 - (tr ? outlineRadius : 0);
        outlinePoints.push(new THREE.Vector3(width/2, yStart + t * (yEnd - yStart), 0));
      }
      if (tr) {
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI/2;
          outlinePoints.push(new THREE.Vector3(
            width/2 - outlineRadius + Math.cos(angle) * outlineRadius,
            height/2 - outlineRadius + Math.sin(angle) * outlineRadius,
            0
          ));
        }
      }
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const xStart = width/2 - (tr ? outlineRadius : 0);
        const xEnd = -width/2 + (tl ? outlineRadius : 0);
        outlinePoints.push(new THREE.Vector3(xStart - t * (xStart - xEnd), height/2, 0));
      }
      if (tl) {
        for (let i = 0; i <= segments; i++) {
          const angle = Math.PI/2 + (i / segments) * Math.PI/2;
          outlinePoints.push(new THREE.Vector3(
            -width/2 + outlineRadius + Math.cos(angle) * outlineRadius,
            height/2 - outlineRadius + Math.sin(angle) * outlineRadius,
            0
          ));
        }
      }
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const yStart = height/2 - (tl ? outlineRadius : 0);
        const yEnd = -height/2 + (bl ? outlineRadius : 0);
        outlinePoints.push(new THREE.Vector3(-width/2, yStart - t * (yStart - yEnd), 0));
      }
      if (bl) {
        for (let i = 0; i <= segments; i++) {
          const angle = Math.PI + (i / segments) * Math.PI/2;
          outlinePoints.push(new THREE.Vector3(
            -width/2 + outlineRadius + Math.cos(angle) * outlineRadius,
            -height/2 + outlineRadius + Math.sin(angle) * outlineRadius,
            0
          ));
        }
      }

      outlinePoints.push(outlinePoints[0].clone());

      const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
      const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
      const outline = new THREE.Line(outlineGeometry, outlineMaterial);
      outline.position.set(width / 2, height / 2, -thickness);
      sceneRef.current.add(outline);
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(width / 2, height / 2, 0);
      controlsRef.current.update();
    }
  }, [deferredWidth, deferredHeight, deferredThickness, withMountingHoles, deferredScrewHoleDiameter, deferredScrewHoleInset,
      extendTop, extendBottom, extendLeft, extendRight,
      roundTopLeft, roundTopRight, roundBottomLeft, roundBottomRight]);

  const generateSTL = () => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const blob = generateBinarySTLBlob(geometry, `skadis_${width}x${height}x${thickness}mm`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skadis_${width}x${height}x${thickness}mm.stl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateSpacerSTL = () => {
    const innerRadius = screwHoleDiameter / 2;
    const outerRadius = screwHoleDiameter / 2 + 3;

    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    ringShape.holes.push(holePath);
    
    const geometry = new THREE.ExtrudeGeometry(ringShape, {
      steps: 1,
      depth: COUNTERSINK_DEPTH,
      bevelEnabled: false
    });
    
    const blob = generateBinarySTLBlob(geometry, 'spacer_10mm');
    geometry.dispose();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spacer_10mm.stl';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const maxDim = Math.max(width, height);
    cameraRef.current.position.set(maxDim * 0.7, maxDim * 0.7, maxDim * 1.5);
    controlsRef.current.target.set(width / 2, height / 2, 0);
    controlsRef.current.update();
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Logo />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-50">Skräddar: IKEA SKÅDIS Pegboard Generator</h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Create your own IKEA SKÅDIS pegboard for 3D printing</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(d => !d)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="relative flex flex-1 overflow-hidden flex-col md:flex-row min-h-0">
        <section className="w-full md:w-80 md:flex-shrink-0 bg-white dark:bg-gray-900 border-b md:border-r md:border-b-0 border-gray-200 dark:border-gray-800 p-4 md:p-6 overflow-y-auto max-h-[40vh] md:max-h-none">
          <h2 className="text-base md:text-lg font-semibold mb-4 text-gray-900 dark:text-gray-50">Settings</h2>
          
          <div className="space-y-4 md:space-y-6">
            <Slider label="Width" name="width" value={width} min={80} max={800} step={40} suffix="mm" onChange={(e) => dispatch({ width: Number(e.target.value) })} />
            <Slider label="Height" name="height" value={height} min={80} max={800} step={40} suffix="mm" onChange={(e) => dispatch({ height: Number(e.target.value) })} />
            <Slider label="Thickness" name="thickness" value={thickness} min={2} max={8} step={0.5} suffix="mm" onChange={(e) => dispatch({ thickness: Number(e.target.value) })}>
              {thickness !== 5 && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                  ⚠️ Recommended: 5mm (standard thickness). Deviation may affect hook compatibility.
                </p>
              )}
            </Slider>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={withMountingHoles}
                  onChange={(e) => dispatch({ withMountingHoles: e.target.checked })}
                  className="mt-0.5 w-5 h-5 accent-black dark:accent-white cursor-pointer flex-shrink-0"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">Screw holes</span>
                </div>
              </label>

              {withMountingHoles && (
                <>
                  <div className="mt-4">
                    <Slider label="Screw Hole Diameter" name="screwHoleDiameter" value={screwHoleDiameter} min={3} max={8} step={0.05} suffix="mm" onChange={(e) => dispatch({ screwHoleDiameter: Number(e.target.value) })} />
                  </div>
                  <div className="mt-4">
                    <Slider label="Screw Hole Inset" name="screwHoleInset" value={screwHoleInset} min={5} max={20} step={0.05} suffix="mm" onChange={(e) => dispatch({ screwHoleInset: Number(e.target.value) })} />
                  </div>
                </>
              )}

            </div>


            <SectionBox title="Edge Holes">
              <div className="space-y-2">
                <Checkbox label="Top" checked={extendTop} onChange={(e) => dispatch({ extendTop: e.target.checked })} centered />
                <div className="flex gap-4 justify-between">
                  <Checkbox label="Left" checked={extendLeft} onChange={(e) => dispatch({ extendLeft: e.target.checked })} />
                  <Checkbox label="Right" checked={extendRight} onChange={(e) => dispatch({ extendRight: e.target.checked })} />
                </div>
                <Checkbox label="Bottom" checked={extendBottom} onChange={(e) => dispatch({ extendBottom: e.target.checked })} centered />
              </div>
            </SectionBox>

            <SectionBox title="Rounded Corners">
              <div className="grid grid-cols-2 gap-2">
                <Checkbox label="Top-left" checked={roundTopLeft} onChange={(e) => dispatch({ roundTopLeft: e.target.checked })} />
                <Checkbox label="Top-right" checked={roundTopRight} onChange={(e) => dispatch({ roundTopRight: e.target.checked })} />
                <Checkbox label="Bottom-left" checked={roundBottomLeft} onChange={(e) => dispatch({ roundBottomLeft: e.target.checked })} />
                <Checkbox label="Bottom-right" checked={roundBottomRight} onChange={(e) => dispatch({ roundBottomRight: e.target.checked })} />
              </div>
            </SectionBox>

            <button
              onClick={() => {
                dispatch({ ...DEFAULTS });
              }}
              className="w-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
            >
              Reset to Defaults
            </button>            
            
            <section className="absolute z-10 bottom-4 right-4 w-fit text-right">
              <h2 className="sr-only">Download Models</h2>

              <div className="flex gap-4 w-fit items-start">
                <button
                  onClick={generateSpacerSTL}
                  className="w-fit border border-white/30 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center gap-2"
                >
                  <DownloadIcon />
                  Download 10mm Spacer STL
                </button>

                <button
                  onClick={generateSTL}
                  className="w-fit border border-white/30 bg-black hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center gap-2"
                >
                  <DownloadIcon />
                  Download Pegboard STL
                </button>

              </div>

              <p className="mt-2 text-xs text-black dark:text-gray-400">
                Print 4 spacers separately if you added mounting holes.
              </p>
            </section>

          </div>
        </section>

        <section className="flex-1 relative min-h-[300px] md:min-h-0">
          <h2 className="sr-only">Board Preview</h2>
          <div ref={mountRef} className="w-full h-full min-h-[300px]" />
          <button
            onClick={resetView}
            className="absolute top-3 left-3 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium py-1.5 px-3 rounded border border-gray-300 dark:border-gray-600 shadow-sm transition-colors"
          >
            Reset view
          </button>
        </section>
      </main>
    </div>
  );
};

export default SkadisGenerator;
