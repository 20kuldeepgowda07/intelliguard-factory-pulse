import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import * as THREE from "three";
import type { MachineKind, MachineStatus } from "@/lib/telemetry";

// Three.js materials need concrete colors; these mirror the CSS tokens in styles.css.
const C = {
  bg: "#dfdedb",
  floor: "#d4d3cf",
  ink: "#24272c",
  inkSoft: "#33373d",
  steel: "#9aa0a7",
  steelLight: "#c3c7cc",
  hazard: "#c8743b",
  hazardDark: "#97501f",
  signal: "#2f62ff",
  offline: "#8f8f8f",
  white: "#f4f3f0",
  pit: "#3a3b3d",
};

export interface SceneNode {
  id: string;
  kind: MachineKind;
  status: MachineStatus;
  nodeId: string;
  reading: string;
}

export type ScenePreset = "overview" | "alerts" | "reports" | "gateway" | "focus";

export const LAYOUT: Record<string, [number, number, number]> = {
  "M-101": [-6, 0, -1.5],
  "M-102": [6.5, 0, -5.5],
  "M-103": [0, 0, -6],
  "M-104": [-7, 0, 5.5],
  "M-105": [6.5, 0, 4],
};
const GATEWAY: [number, number, number] = [-11, 0, -8];
const pos = (id: string): [number, number, number] => LAYOUT[id] ?? [0, 0, 0];

export const beaconHeight = (kind: MachineKind) => (kind === "mill" ? 5 : kind === "fan" ? 4.6 : 4);

const statusColor = (s: MachineStatus) =>
  s === "warning" ? C.hazard : s === "offline" ? C.offline : C.signal;

/* ----------------------------- camera ----------------------------- */

function CameraRig({ preset, focusId }: { preset: ScenePreset; focusId?: string | undefined }) {
  const { camera } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const target = useRef(new THREE.Vector3(0, 1, 0));

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const conf = useMemo(() => {
    if (preset === "focus" && focusId && LAYOUT[focusId]) {
      const [x, , z] = pos(focusId);
      return { look: new THREE.Vector3(x, 1.4, z), radius: 9.5, height: 4.2, angle: 0.75, shift: 2.6 };
    }
    if (preset === "gateway")
      return { look: new THREE.Vector3(-8, 2.5, -5), radius: 13, height: 5.5, angle: 0.55, shift: 4 };
    if (preset === "reports")
      return { look: new THREE.Vector3(0, 0, -0.5), radius: 15, height: 19, angle: 0.35, shift: 5 };
    if (preset === "alerts")
      return { look: new THREE.Vector3(1, 1.4, 0), radius: 17, height: 5, angle: 1.05, shift: 5 };
    return { look: new THREE.Vector3(0.5, 1, -0.5), radius: 24, height: 12, angle: 0.72, shift: 5.5 };
  }, [preset, focusId]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const a = conf.angle + Math.sin(t * 0.07) * 0.22 + pointer.current.x * 0.12;
    const desired = new THREE.Vector3(
      conf.look.x + Math.sin(a) * conf.radius,
      conf.height - pointer.current.y * 0.8,
      conf.look.z + Math.cos(a) * conf.radius,
    );
    // Shift the look point left along the camera's right axis so machines sit right of the headline.
    const narrow = state.size.width < 1024 ? 0 : 1;
    const look = conf.look.clone().addScaledVector(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), -conf.shift * narrow);
    const lift = desired.clone().addScaledVector(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), -conf.shift * narrow);
    const k = 1 - Math.pow(0.02, delta);
    camera.position.lerp(lift, k * 0.6);
    target.current.lerp(look, k * 0.6);
    camera.lookAt(target.current);
  });
  return null;
}

/* ----------------------------- shell ----------------------------- */

function Hall() {
  const columns: [number, number][] = [];
  for (const x of [-14, 14]) for (const z of [-12, -6, 0, 6, 12]) columns.push([x, z]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={C.floor} roughness={0.95} />
      </mesh>
      <Grid
        position={[0, 0.005, 0]}
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={C.steel}
        sectionSize={6}
        sectionThickness={1}
        sectionColor={C.steel}
        fadeDistance={45}
        fadeStrength={1.4}
        infiniteGrid
      />
      {/* Walkway safety lines */}
      {[-3.2, 2.6].map((z) => (
        <mesh key={z} rotation-x={-Math.PI / 2} position={[0, 0.012, z]}>
          <planeGeometry args={[26, 0.12]} />
          <meshBasicMaterial color={C.hazard} />
        </mesh>
      ))}
      {columns.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh castShadow position={[0, 5, 0]}>
            <boxGeometry args={[0.5, 10, 0.5]} />
            <meshStandardMaterial color={C.steelLight} metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.56, 1.2, 0.56]} />
            <meshStandardMaterial color={C.hazard} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Roof trusses */}
      {[-12, -6, 0, 6, 12].map((z) => (
        <group key={z} position={[0, 10, z]}>
          <mesh>
            <boxGeometry args={[28.5, 0.3, 0.3]} />
            <meshStandardMaterial color={C.steelLight} metalness={0.4} roughness={0.5} />
          </mesh>
          {[-8, 0, 8].map((x) => (
            <mesh key={x} position={[x, -0.6, 0]}>
              <boxGeometry args={[2.4, 0.12, 0.5]} />
              <meshStandardMaterial color={C.white} emissive={C.white} emissiveIntensity={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Back wall with clerestory windows */}
      <mesh position={[0, 5, -14]} receiveShadow>
        <boxGeometry args={[30, 10, 0.3]} />
        <meshStandardMaterial color={"#cfcecb"} roughness={1} />
      </mesh>
      {[-10, -5, 0, 5, 10].map((x) => (
        <mesh key={x} position={[x, 7.5, -13.8]}>
          <planeGeometry args={[3.6, 2.2]} />
          <meshBasicMaterial color={"#f7f6f2"} />
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------------- machines ----------------------------- */

function useSpin(speed: number, axis: "x" | "y" | "z" = "x") {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation[axis] += d * speed;
  });
  return ref;
}

const Mat = {
  ink: <meshStandardMaterial color={C.ink} metalness={0.35} roughness={0.45} />,
  inkSoft: <meshStandardMaterial color={C.inkSoft} metalness={0.3} roughness={0.5} />,
  steel: <meshStandardMaterial color={C.steel} metalness={0.7} roughness={0.35} />,
  hazard: <meshStandardMaterial color={C.hazard} roughness={0.55} />,
  white: <meshStandardMaterial color={C.white} roughness={0.7} />,
};

function Plinth({ w, d }: { w: number; d: number }) {
  return (
    <RoundedBox args={[w, 0.3, d]} radius={0.05} position={[0, 0.15, 0]} receiveShadow castShadow>
      <meshStandardMaterial color={"#bdbcb8"} roughness={0.9} />
    </RoundedBox>
  );
}

function FeedPump({ running }: { running: boolean }) {
  const coupling = useSpin(running ? 14 : 0);
  return (
    <group>
      <Plinth w={4.2} d={1.8} />
      {/* Motor + fins */}
      <group position={[-0.9, 0.95, 0]} rotation-z={Math.PI / 2}>
        <mesh castShadow>
          <cylinderGeometry args={[0.55, 0.55, 1.7, 32]} />
          {Mat.ink}
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[0, -0.7 + i * 0.2, 0]}>
            <cylinderGeometry args={[0.62, 0.62, 0.05, 32]} />
            {Mat.inkSoft}
          </mesh>
        ))}
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.5, 0.58, 0.25, 32]} />
          {Mat.hazard}
        </mesh>
      </group>
      <mesh position={[-0.9, 1.65, 0]} castShadow>
        <boxGeometry args={[0.5, 0.3, 0.45]} />
        {Mat.inkSoft}
      </mesh>
      {/* Coupling */}
      <group ref={coupling} position={[0.25, 0.95, 0]}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.24, 0.24, 0.45, 6]} />
          {Mat.steel}
        </mesh>
      </group>
      {/* Volute */}
      <mesh position={[1.15, 0.95, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.7, 32]} />
        {Mat.ink}
      </mesh>
      <mesh position={[1.65, 0.95, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.28, 0.28, 0.6, 24]} />
        {Mat.steel}
      </mesh>
      {/* Discharge pipe */}
      <mesh position={[1.15, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 2.2, 20]} />
        {Mat.steel}
      </mesh>
      <mesh position={[1.15, 3.5, -3]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.2, 0.2, 6, 20]} />
        {Mat.steel}
      </mesh>
      {/* Sensor node */}
      <mesh position={[0.65, 1.55, 0]}>
        <boxGeometry args={[0.22, 0.16, 0.22]} />
        {Mat.white}
      </mesh>
    </group>
  );
}

function ExhaustFan({ running }: { running: boolean }) {
  const blades = useSpin(running ? 6 : 0, "z");
  return (
    <group>
      <Plinth w={3} d={1.4} />
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 1.1, 1.3, 0]} castShadow>
          <boxGeometry args={[0.15, 2.3, 0.15]} />
          {Mat.ink}
        </mesh>
      ))}
      <group position={[0, 2.5, 0]}>
        <mesh castShadow>
          <torusGeometry args={[1.25, 0.16, 16, 48]} />
          {Mat.ink}
        </mesh>
        <mesh position={[0, 0, -0.35]}>
          <cylinderGeometry args={[1.22, 1.22, 0.7, 48, 1, true]} />
          <meshStandardMaterial color={C.inkSoft} side={THREE.DoubleSide} />
        </mesh>
        <group ref={blades}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.22, 0.22, 0.35, 20]} />
            {Mat.hazard}
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <group key={i} rotation-z={(i / 6) * Math.PI * 2}>
              <mesh position={[0.62, 0, 0]} rotation-x={0.45}>
                <boxGeometry args={[0.85, 0.32, 0.04]} />
                {Mat.steel}
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

function Mill({ running }: { running: boolean }) {
  const spindle = useSpin(running ? 18 : 0, "y");
  const table = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (table.current && running) table.current.position.x = Math.sin(clock.elapsedTime * 0.6) * 0.45;
  });
  return (
    <group>
      <Plinth w={3} d={2.2} />
      <RoundedBox args={[2.2, 0.9, 1.5]} radius={0.06} position={[0, 0.75, 0.1]} castShadow>
        {Mat.ink}
      </RoundedBox>
      <mesh ref={table} position={[0, 1.28, 0.35]} castShadow>
        <boxGeometry args={[1.8, 0.14, 0.8]} />
        {Mat.steel}
      </mesh>
      <RoundedBox args={[0.8, 3, 0.8]} radius={0.06} position={[0, 2.1, -0.55]} castShadow>
        {Mat.ink}
      </RoundedBox>
      <RoundedBox args={[0.95, 0.75, 1.1]} radius={0.06} position={[0, 3.2, 0.05]} castShadow>
        {Mat.hazard}
      </RoundedBox>
      <group ref={spindle} position={[0, 2.45, 0.35]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.14, 0.7, 12]} />
          {Mat.steel}
        </mesh>
      </group>
      <mesh position={[0, 3.85, -0.4]} castShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.7, 24]} />
        {Mat.inkSoft}
      </mesh>
    </group>
  );
}

function Compressor() {
  return (
    <group>
      <Plinth w={3.8} d={1.8} />
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 0.9, 0.5, 0]}>
          <boxGeometry args={[0.2, 0.4, 1]} />
          {Mat.ink}
        </mesh>
      ))}
      <mesh position={[0, 1.15, 0]} rotation-z={Math.PI / 2} castShadow>
        <capsuleGeometry args={[0.62, 2.2, 8, 24]} />
        <meshStandardMaterial color={"#6f7378"} metalness={0.5} roughness={0.45} />
      </mesh>
      <RoundedBox args={[1.3, 0.6, 0.8]} radius={0.05} position={[-0.3, 2.05, 0]} castShadow>
        {Mat.ink}
      </RoundedBox>
      <mesh position={[0.65, 2.05, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.28, 0.28, 0.6, 20]} />
        {Mat.inkSoft}
      </mesh>
      <mesh position={[1.3, 1.9, 0.35]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.16, 0.16, 0.06, 24]} />
        {Mat.white}
      </mesh>
    </group>
  );
}

function SumpPump({ running, hot }: { running: boolean; hot: boolean }) {
  const motor = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (motor.current) motor.current.emissiveIntensity = hot ? 0.35 + Math.sin(clock.elapsedTime * 3) * 0.25 : 0;
  });
  const fan = useSpin(running ? 10 : 0, "y");
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[3.2, 3.2]} />
        <meshStandardMaterial color={C.pit} roughness={1} />
      </mesh>
      {/* Guard rail */}
      {[-1.6, 1.6].flatMap((a) => [
        <mesh key={`x${a}`} position={[a, 0.55, 0]}>
          <boxGeometry args={[0.06, 0.06, 3.2]} />
          {Mat.hazard}
        </mesh>,
        <mesh key={`z${a}`} position={[0, 0.55, a]}>
          <boxGeometry args={[3.2, 0.06, 0.06]} />
          {Mat.hazard}
        </mesh>,
      ])}
      {[-1.6, 1.6].flatMap((x) =>
        [-1.6, 1.6].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.3, z]}>
            <boxGeometry args={[0.07, 0.6, 0.07]} />
            {Mat.ink}
          </mesh>
        )),
      )}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.4, 2, 24]} />
        {Mat.ink}
      </mesh>
      <mesh position={[0, 2.35, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.9, 32]} />
        <meshStandardMaterial ref={motor} color={C.ink} emissive={C.hazard} metalness={0.3} roughness={0.5} />
      </mesh>
      <group ref={fan} position={[0, 2.85, 0]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 6]} />
          {Mat.hazard}
        </mesh>
      </group>
      <mesh position={[0.6, 1.6, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.16, 0.16, 1.2, 16]} />
        {Mat.steel}
      </mesh>
      <mesh position={[1.2, 2.6, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 2, 16]} />
        {Mat.steel}
      </mesh>
    </group>
  );
}

function Machine({ node }: { node: SceneNode }) {
  const running = node.status !== "offline";
  let body: ReactNode = null;
  if (node.kind === "pump") body = <FeedPump running={running} />;
  if (node.kind === "fan") body = <ExhaustFan running={running} />;
  if (node.kind === "mill") body = <Mill running={running} />;
  if (node.kind === "compressor") body = <Compressor />;
  if (node.kind === "sump") body = <SumpPump running={running} hot={node.status === "warning"} />;
  return <group position={pos(node.id)}>{body}</group>;
}

/* ----------------------------- telemetry overlays ----------------------------- */

function Beacon({ node, focused }: { node: SceneNode; focused: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const orb = useRef<THREE.Mesh>(null);
  const color = statusColor(node.status);
  const [x, , z] = pos(node.id);
  const h = beaconHeight(node.kind);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * (node.status === "warning" ? 0.9 : 0.5)) % 1;
    if (ring.current && ringMat.current) {
      const s = node.status === "offline" ? 1.4 : 1 + t * 2.2;
      ring.current.scale.setScalar(s);
      ringMat.current.opacity = node.status === "offline" ? 0.25 : 0.7 * (1 - t);
    }
    if (orb.current) orb.current.position.y = h + Math.sin(clock.elapsedTime * 1.5 + x) * 0.12;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.7, 1.82, 64]} />
        <meshBasicMaterial ref={ringMat} color={color} transparent />
      </mesh>
      <mesh position={[0, h / 2 + 0.4, 0]}>
        <cylinderGeometry args={[0.012, 0.012, h - 0.8, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>
      <mesh ref={orb} position={[0, h, 0]}>
        <sphereGeometry args={[focused ? 0.2 : 0.15, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function Gateway() {
  const light = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (light.current) light.current.emissiveIntensity = 0.6 + (Math.sin(clock.elapsedTime * 4) > 0 ? 1.4 : 0);
  });
  return (
    <group position={GATEWAY}>
      <RoundedBox args={[1.6, 1.2, 1]} radius={0.08} position={[0, 0.6, 0]} castShadow>
        {Mat.ink}
      </RoundedBox>
      <mesh position={[0, 4, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 6, 8]} />
        {Mat.steel}
      </mesh>
      {[2.5, 4, 5.5].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.35, 0.03, 8, 24]} />
          {Mat.steel}
        </mesh>
      ))}
      <mesh position={[0, 7.1, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial ref={light} color={C.signal} emissive={C.signal} />
      </mesh>
    </group>
  );
}

function Packets({ nodes }: { nodes: SceneNode[] }) {
  const curves = useMemo(
    () =>
      nodes
        .filter((n) => n.status !== "offline")
        .map((n, i) => {
          const [x, , z] = pos(n.id);
          const start = new THREE.Vector3(x, 4.2, z);
          const end = new THREE.Vector3(GATEWAY[0], 7.1, GATEWAY[2]);
          const mid = start.clone().lerp(end, 0.5);
          mid.y += 3;
          const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
          const color = statusColor(n.status);
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
            new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.2, transparent: true, opacity: 0.4 }),
          );
          line.computeLineDistances();
          return { id: n.id, curve, color, offset: i * 0.23, line };
        }),
    [nodes],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    curves.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const t = (clock.elapsedTime * 0.22 + c.offset) % 1;
      m.position.copy(c.curve.getPoint(t));
    });
  });
  return (
    <group>
      {curves.map((c, i) => (
        <group key={c.id}>
          <mesh
            ref={(el) => {
              refs.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial color={c.color} />
          </mesh>
          <primitive object={c.line} />
        </group>
      ))}
    </group>
  );
}

function Conveyor() {
  const crates = useRef<(THREE.Mesh | null)[]>([]);
  const arm = useRef<THREE.Group>(null);
  const elbow = useRef<THREE.Group>(null);
  const len = 8;
  useFrame(({ clock }, d) => {
    crates.current.forEach((c) => {
      if (!c) return;
      c.position.x += d * 0.9;
      if (c.position.x > len / 2) c.position.x -= len;
    });
    const t = clock.elapsedTime;
    if (arm.current) arm.current.rotation.y = Math.sin(t * 0.7) * 1.1;
    if (elbow.current) elbow.current.rotation.z = -0.9 + Math.sin(t * 1.4) * 0.35;
  });
  return (
    <group position={[0.2, 0, 0.6]}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, 0.18, 1.1]} />
        <meshStandardMaterial color={"#2c2f34"} roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.78, s * 0.6]}>
          <boxGeometry args={[len, 0.24, 0.08]} />
          {Mat.steel}
        </mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-len / 2 + 0.5 + i * 1.4, 0.35, 0]}>
          <boxGeometry args={[0.12, 0.7, 0.9]} />
          {Mat.ink}
        </mesh>
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            crates.current[i] = el;
          }}
          position={[-len / 2 + i * (len / 5), 1.12, 0]}
          castShadow
        >
          <boxGeometry args={[0.6, 0.55, 0.6]} />
          <meshStandardMaterial color={i % 2 ? "#c9a27a" : "#b88d62"} roughness={0.9} />
        </mesh>
      ))}
      {/* Robot arm */}
      <group position={[1.2, 0, 1.6]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.55, 0.5, 24]} />
          {Mat.ink}
        </mesh>
        <group ref={arm} position={[0, 0.5, 0]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.4, 20]} />
            {Mat.hazard}
          </mesh>
          <group position={[0, 0.4, 0]} rotation-z={0.5}>
            <mesh position={[0, 0.7, 0]} castShadow>
              <boxGeometry args={[0.24, 1.4, 0.24]} />
              {Mat.hazard}
            </mesh>
            <group ref={elbow} position={[0, 1.4, 0]}>
              <mesh rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.16, 0.16, 0.3, 16]} />
                {Mat.ink}
              </mesh>
              <mesh position={[0, 0.55, 0]} castShadow>
                <boxGeometry args={[0.18, 1.1, 0.18]} />
                {Mat.hazard}
              </mesh>
              <mesh position={[0, 1.15, 0]}>
                <boxGeometry args={[0.3, 0.12, 0.12]} />
                {Mat.ink}
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      pts[i * 3] = (Math.sin(i * 12.9898) * 0.5) * 28;
      pts[i * 3 + 1] = Math.abs(Math.sin(i * 78.233)) * 9;
      pts[i * 3 + 2] = (Math.cos(i * 4.1414) * 0.5) * 26;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.01;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={"#ffffff"} size={0.05} transparent opacity={0.8} />
    </points>
  );
}

function LabelProjector({ nodes, refs }: { nodes: SceneNode[]; refs: MutableRefObject<Record<string, HTMLElement | null>> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const n of nodes) {
      const el = refs.current[n.id];
      if (!el) continue;
      const [x, , z] = pos(n.id);
      v.set(x, beaconHeight(n.kind) + 0.6, z).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.opacity = visible ? "1" : "0";
      el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
    }
  });
  return null;
}

/* ----------------------------- root ----------------------------- */

export interface FactorySceneProps {
  nodes: SceneNode[];
  preset?: ScenePreset;
  focusId?: string | undefined;
  labels?: boolean;
  active?: boolean;
  /** DOM label elements (rendered outside the canvas) positioned over each beacon every frame. */
  labelRefs?: MutableRefObject<Record<string, HTMLElement | null>>;
}

export default function FactoryScene({ nodes, preset = "overview", focusId, labels = true, active = true, labelRefs }: FactorySceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [16, 10, 18], fov: 38, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[C.bg]} />
      <fog attach="fog" args={[C.bg, 20, 52]} />
      <hemisphereLight args={["#ffffff", "#b9b7b2", 1.1]} />
      <directionalLight
        position={[10, 18, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      <pointLight position={[6.5, 3, 4]} intensity={nodes.find((n) => n.id === "M-105")?.status === "warning" ? 6 : 0} color={C.hazard} distance={6} />
      <CameraRig preset={preset} focusId={focusId} />
      <Hall />
      <Conveyor />
      <Gateway />
      {nodes.map((n) => (
        <Machine key={n.id} node={n} />
      ))}
      {nodes.map((n) => (
        <Beacon key={n.id} node={n} focused={n.id === focusId} />
      ))}
      <Packets nodes={nodes} />
      {labels && labelRefs && <LabelProjector nodes={nodes} refs={labelRefs} />}
      <Dust />
    </Canvas>
  );
}
