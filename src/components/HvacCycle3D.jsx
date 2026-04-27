'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const COMPONENTS = {
  compressor: { label: 'Compresseur', className: 'left-[13%] top-[48%]' },
  condenser: { label: 'Condenseur', className: 'left-[43%] top-[13%]' },
  expansionValve: { label: 'Détendeur', className: 'right-[13%] top-[48%]' },
  evaporator: { label: 'Évaporateur', className: 'left-[43%] bottom-[12%]' }
};

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
      else child.material.dispose();
    }
  });
}

function makeMaterial(color, highlighted = false) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: highlighted ? 0.15 : 0.25,
    roughness: highlighted ? 0.28 : 0.5,
    emissive: highlighted ? color : 0x000000,
    emissiveIntensity: highlighted ? 0.32 : 0.04
  });
}

function makePipe(points, color, radius = 0.055) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geometry = new THREE.TubeGeometry(curve, 80, radius, 16, false);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 });
  return new THREE.Mesh(geometry, material);
}

function makeComponent(type, isHighlighted) {
  const group = new THREE.Group();
  group.userData.component = type;

  if (type === 'compressor') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.82, 40),
      makeMaterial(0xef4444, isHighlighted)
    );
    body.rotation.z = Math.PI / 2;
    group.add(body);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.34), makeMaterial(0x991b1b, isHighlighted));
    cap.position.x = -0.44;
    group.add(cap);
  }

  if (type === 'condenser') {
    const coil = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.18), makeMaterial(0xf97316, isHighlighted));
    group.add(coil);
    for (let i = -3; i <= 3; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.24), makeMaterial(0xfdba74, isHighlighted));
      fin.position.x = i * 0.24;
      group.add(fin);
    }
  }

  if (type === 'expansionValve') {
    const valve = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), makeMaterial(0x22c55e, isHighlighted));
    group.add(valve);
    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 16), makeMaterial(0x86efac, isHighlighted));
    spindle.rotation.z = Math.PI / 2;
    group.add(spindle);
  }

  if (type === 'evaporator') {
    const coil = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.18), makeMaterial(0x38bdf8, isHighlighted));
    group.add(coil);
    for (let i = -3; i <= 3; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.24), makeMaterial(0x7dd3fc, isHighlighted));
      fin.position.x = i * 0.24;
      group.add(fin);
    }
  }

  if (isHighlighted) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.025, 12, 80),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  return group;
}

export default function HvacCycle3D({ highlightedComponent = 'all', params }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020617, 5, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 3.8, 6.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 4;
    controls.maxDistance = 9;
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x94a3b8, 1.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.7);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const blueLight = new THREE.PointLight(0x38bdf8, 2, 9);
    blueLight.position.set(-3, -2, 2);
    scene.add(blueLight);

    const group = new THREE.Group();
    scene.add(group);

    const highSideColor = params?.hp >= 21 ? 0xff3300 : 0xf97316;
    const lowSideColor = params?.bp <= 3.2 ? 0x0ea5e9 : 0x38bdf8;

    group.add(makePipe([[-2.8, 0, 0], [-2.8, 1.7, 0], [0, 1.7, 0], [2.8, 1.7, 0], [2.8, 0, 0]], highSideColor, 0.055));
    group.add(makePipe([[2.8, 0, 0], [2.8, -1.7, 0], [0, -1.7, 0], [-2.8, -1.7, 0], [-2.8, 0, 0]], lowSideColor, 0.055));

    const components = [
      ['compressor', [-2.8, 0, 0]],
      ['condenser', [0, 1.7, 0]],
      ['expansionValve', [2.8, 0, 0]],
      ['evaporator', [0, -1.7, 0]]
    ];

    components.forEach(([type, position]) => {
      const isHighlighted = highlightedComponent === 'all' || highlightedComponent === type;
      const component = makeComponent(type, isHighlighted);
      component.position.set(...position);
      if (type === 'condenser' || type === 'evaporator') component.rotation.x = -0.12;
      group.add(component);
    });

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 3.8, 0.06, 96),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, transparent: true, opacity: 0.72, roughness: 0.75 })
    );
    platform.position.y = -2.05;
    group.add(platform);

    const particles = [];
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 22; i += 1) {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), particleMaterial.clone());
      particle.userData.offset = i / 22;
      group.add(particle);
      particles.push(particle);
    }

    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.8, 0, 0),
      new THREE.Vector3(-2.8, 1.7, 0),
      new THREE.Vector3(0, 1.7, 0),
      new THREE.Vector3(2.8, 1.7, 0),
      new THREE.Vector3(2.8, 0, 0),
      new THREE.Vector3(2.8, -1.7, 0),
      new THREE.Vector3(0, -1.7, 0),
      new THREE.Vector3(-2.8, -1.7, 0),
      new THREE.Vector3(-2.8, 0, 0)
    ], true);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      group.rotation.y = Math.sin(elapsed * 0.2) * 0.08;

      particles.forEach((particle) => {
        const t = (elapsed * 0.09 + particle.userData.offset) % 1;
        const point = path.getPointAt(t);
        particle.position.copy(point);
        particle.material.color.set(t < 0.52 ? highSideColor : lowSideColor);
      });

      controls.update();
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [highlightedComponent, params?.bp, params?.hp, params?.sh, params?.sc]);

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.25),rgba(2,6,23,0.98)_60%)] shadow-2xl shadow-black">
      <div ref={mountRef} className="h-full min-h-[420px] w-full" />
      {Object.entries(COMPONENTS).map(([key, item]) => {
        const active = highlightedComponent === 'all' || highlightedComponent === key;
        return (
          <div
            key={key}
            className={`pointer-events-none absolute ${item.className} rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] transition ${
              active ? 'border-white/60 bg-white/15 text-white shadow-glow' : 'border-slate-700 bg-slate-950/60 text-slate-500'
            }`}
          >
            {item.label}
          </div>
        );
      })}
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-400 backdrop-blur">
        Orbite 3D : glisser pour tourner, molette pour zoomer.
      </div>
    </div>
  );
}
