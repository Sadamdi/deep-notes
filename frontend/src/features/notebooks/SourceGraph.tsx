import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Minimal three.js scene: one sphere per source on a ring. It is a view-only helper; the page
 * stays fully usable without it (all information is also in the table), and it honors the
 * reduced-motion setting by not animating.
 */
export default function SourceGraph({ labels }: { labels: string[] }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const width = el.clientWidth || 300;
    const height = 220;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 6;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const group = new THREE.Group();
    labels.forEach((_, i) => {
      const angle = (i / Math.max(labels.length, 1)) * Math.PI * 2;
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x6366f1 }),
      );
      node.position.set(Math.cos(angle) * 2, Math.sin(angle) * 2, 0);
      group.add(node);
    });
    scene.add(group);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const render = () => {
      if (!reduceMotion) group.rotation.z += 0.004;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
      renderer.domElement.remove();
    };
  }, [labels]);

  return <div ref={host} role="img" aria-label={`Map of ${labels.length} sources`} />;
}
