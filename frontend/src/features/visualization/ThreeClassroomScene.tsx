import { useEffect, useRef, useState } from "react";
import type { MindMapResponse, NotebookMember } from "@deep-notes/shared";

function cssColor(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function ThreeClassroomScene({ graph, members }: { graph: MindMapResponse; members: NotebookMember[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [supported, setSupported] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    setReady(false);

    void import("three").then((THREE) => {
      if (cancelled) return;
      try {
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(cssColor("--background"));
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 5.2, 14.5);
        camera.lookAt(0, 1.6, -1.2);
        scene.add(new THREE.HemisphereLight(cssColor("--foreground"), cssColor("--warning"), 2));
        const keyLight = new THREE.DirectionalLight(cssColor("--foreground"), 2.5);
        keyLight.position.set(-5, 10, 8);
        scene.add(keyLight);

        const addBox = (width: number, height: number, depth: number, x: number, y: number, z: number, color: string) => {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial({ color }));
          mesh.position.set(x, y, z);
          scene.add(mesh);
        };
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 14), new THREE.MeshStandardMaterial({ color: cssColor("--warning") }));
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);
        addBox(18, 8, 0.25, 0, 4, -6.8, cssColor("--secondary"));
        addBox(10, 3.3, 0.24, 0, 3.45, -6.55, cssColor("--navy"));

        const visibleNodes = graph.nodes.slice(0, 10);
        const nodePoints = new Map(visibleNodes.map((node, index) => [node.id, new THREE.Vector3(-3.6 + (index % 5) * 1.8, 3.5 + Math.floor(index / 5) * 1.1, -6.28)]));
        for (const edge of graph.edges) {
          const from = nodePoints.get(edge.from);
          const to = nodePoints.get(edge.to);
          if (!from || !to) continue;
          scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), new THREE.LineBasicMaterial({ color: cssColor("--mint") })));
        }
        for (const point of nodePoints.values()) {
          const marker = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), new THREE.MeshStandardMaterial({ color: cssColor("--mint") }));
          marker.position.copy(point);
          scene.add(marker);
        }

        const desks = Math.min(4, members.length);
        for (let index = 0; index < desks; index += 1) {
          const x = (index - (desks - 1) / 2) * 2.8;
          addBox(1.75, 0.28, 1.1, x, 0.82, -1.25, cssColor("--teal"));
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 1.15, 12), new THREE.MeshStandardMaterial({ color: cssColor(index % 2 ? "--coral" : "--mint") }));
          body.position.set(x, 1.03, 0.4);
          scene.add(body);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshStandardMaterial({ color: cssColor("--warning") }));
          head.position.set(x, 1.82, 0.4);
          scene.add(head);
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        const resize = () => {
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(300, host.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
          renderer.render(scene, camera);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();
        dispose = () => {
          observer.disconnect();
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
          });
          renderer.dispose();
        };
        setSupported(true);
        setReady(true);
      } catch {
        setSupported(false);
      }
    }).catch(() => {
      if (!cancelled) setSupported(false);
    });

    return () => { cancelled = true; dispose?.(); };
  }, [graph, members]);

  if (!supported) return <div className="grid min-h-72 place-items-center rounded-2xl bg-secondary/60 p-6 text-center"><p className="max-w-md text-sm leading-6 text-muted-foreground">Perangkat ini tidak menyediakan WebGL. Topik dan anggota kelas tetap tersedia dalam daftar di bawah.</p></div>;
  return <div className="relative"><canvas aria-label={`Tampilan ruang kelas dengan ${members.length} anggota dan ${graph.nodes.length} topik dari sumber`} className="block h-[clamp(300px,48vw,540px)] w-full rounded-2xl" ref={canvasRef} role="img"/>{!ready && <p className="absolute inset-0 grid place-items-center rounded-2xl bg-secondary/50 text-sm text-muted-foreground" role="status">Menyiapkan kelas 3D…</p>}</div>;
}
