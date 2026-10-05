import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ComponentType, ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Edges, Grid, Html, Line, OrbitControls, RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { BarChart3, Bot, BrainCircuit, Database, Layers, MessageSquare } from 'lucide-react'

type Vec2 = [number, number] 

const C = {
  glass: '#ffffff',
  blue: '#0b0b0b',      
  primary: '#1a1a19',   
  sky: '#2c2c2a',       
  cyan: '#898781',      
  indigo: '#52514e',    
  ice: '#cacac7',       
}

const TINT = {
  data: '#f9f9f7',     
  ai: '#f0f0ee',       
  lake: '#f9f9f7',
  lakeTop: '#fcfcfb',  
  chat: '#fcfcfb',
  agents: '#f9f9f7',
  bi: '#fcfcfb',
}

const FLOOR_Y = 0.03

const CONNECTIONS: Array<{ id: string; points: Vec2[]; context?: boolean }> = [
  { id: 'data-ai', points: [[-5.75, 0], [-5.1, 0], [-5.1, -3], [-4.5, -3]] },
  { id: 'ai-lake', points: [[-3.3, -2.3], [-3.3, -0.1]] },
  { id: 'lake-ai', points: [[-2.4, 0.4], [-1.6, 0.4], [-1.6, -2.3]], context: true },
  { id: 'ai-chat', points: [[2.8, -2.3], [2.8, 1.2], [0, 1.2], [0, 1.8]] },
  { id: 'ai-agents', points: [[2.8, -2.3], [2.8, 1.8]] },
  { id: 'ai-bi', points: [[2.8, -2.3], [2.8, 1.2], [5.6, 1.2], [5.6, 1.8]] },
  { id: 'lake-chat', points: [[-2.4, 1.3], [-1.2, 1.3], [-1.2, 2.4], [-0.75, 2.4]], context: true },
  { id: 'lake-agents', points: [[-3.9, 1.7], [-3.9, 3.6], [2.8, 3.6], [2.8, 3.0]], context: true },
  { id: 'lake-bi', points: [[-4.2, 1.7], [-4.2, 3.95], [5.6, 3.95], [5.6, 3.0]], context: true },
]

function toVec3(points: Vec2[], y = FLOOR_Y): THREE.Vector3[] {
  return points.map(([x, z]) => new THREE.Vector3(x, y, z))
}

export default function ArchitectureScene() {
  const reduceMotion = usePrefersReducedMotion()
  const animate = !reduceMotion

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0.4, 9.2, 12.6], fov: 32, near: 0.1, far: 100 }}
      style={{ touchAction: 'pan-y' }}
    >
      <fog attach="fog" args={['#f9f9f7', 18, 36]} />
      <ambientLight intensity={0.9} color="#ffffff" />
      <directionalLight position={[5, 10, 7]} intensity={1.2} color="#ffffff" />
      <pointLight position={[1, 3.2, -3]} intensity={6} distance={8} color="#ffffff" />
      <pointLight position={[-3.3, 2, 0.8]} intensity={4} distance={6} color="#ffffff" />

      <Grid
        position={[0, 0, 0]}
        infiniteGrid
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#e3e3e0"
        sectionSize={2.5}
        sectionThickness={0.9}
        sectionColor="#cacac7"
        fadeDistance={26}
        fadeStrength={1.6}
      />

      <Sparkles count={90} scale={[20, 6, 14]} position={[0, 2.6, 0]} size={2.4} speed={animate ? 0.25 : 0} color="#a3a29d" opacity={0.5} />

      <SwayGroup enabled={animate}>
        <group position={[0.35, 0, -0.35]}>
          {CONNECTIONS.map((c) => (
            <Connection key={c.id} points={c.points} context={c.context} animate={animate} />
          ))}

          <DataStack position={[-6.5, 0]} animate={animate} />
          <AiCore position={[1, -3]} animate={animate} />
          <Lakehouse position={[-3.3, 0.8]} animate={animate} />
          <Outlet position={[0, 2.4]} label="Chat on Data" icon={MessageSquare} accent={C.cyan} tint={TINT.chat} animate={animate} phase={0} />
          <Outlet position={[2.8, 2.4]} label="AI Agents" icon={Bot} accent={C.sky} tint={TINT.agents} animate={animate} phase={1.3} />
          <Outlet position={[5.6, 2.4]} label="BI" icon={BarChart3} accent={C.indigo} tint={TINT.bi} animate={animate} phase={2.6} />
        </group>
      </SwayGroup>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        target={[0.35, 0.3, 0.1]}
        minPolarAngle={0.55}
        maxPolarAngle={1.1}
        minAzimuthAngle={-0.5}
        maxAzimuthAngle={0.5}
      />
    </Canvas>
  )
}

function SwayGroup({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = enabled ? Math.sin(clock.elapsedTime * 0.16) * 0.045 : 0
  })
  return <group ref={ref}>{children}</group>
}

function Glass({ tint = C.glass }: { tint?: string }) {
  return (
    <meshPhysicalMaterial
      color={tint}
      emissive={tint}
      emissiveIntensity={0.35}
      roughness={0.22}
      metalness={0.02}
      clearcoat={1}
      clearcoatRoughness={0.18}
      transparent
      opacity={0.96}
    />
  )
}

function Connection({ points, context = false, animate }: { points: Vec2[]; context?: boolean; animate: boolean }) {
  const pts = useMemo(() => toVec3(points), [points])
  const color = context ? C.cyan : C.blue
  return (
    <>
      <Line points={pts} color={color} lineWidth={6} transparent opacity={0.05} toneMapped={false} />
      <Line
        points={pts}
        color={color}
        lineWidth={context ? 1.5 : 1.8}
        dashed={context}
        dashSize={0.14}
        gapSize={0.14}
        transparent
        opacity={0.85}
        toneMapped={false}
      />
      {animate ? <Pulses points={pts} color={color} context={context} /> : null}
    </>
  )
}

function Pulses({ points, color, context }: { points: THREE.Vector3[]; color: string; context: boolean }) {
  const path = useMemo(() => {
    const p = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i < points.length - 1; i++) p.add(new THREE.LineCurve3(points[i], points[i + 1]))
    return p
  }, [points])
  const length = useMemo(() => path.getLength(), [path])
  const count = context ? 1 : 2
  const speed = context ? 1.2 : 1.8
  const refs = useRef<Array<THREE.Group | null>>([])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock }) => {
    for (let i = 0; i < count; i++) {
      const g = refs.current[i]
      if (!g) continue
      const t = ((clock.elapsedTime * speed) / length + i / count) % 1
      path.getPointAt(t, tmp)
      g.position.set(tmp.x, tmp.y + 0.08, tmp.z)
      g.scale.setScalar(Math.min(1, Math.min(t, 1 - t) * 8))
    }
  })

  const size = context ? 0.06 : 0.08
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }}>
          <mesh>
            <sphereGeometry args={[size, 16, 16]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <Halo color={color} size={size * 4} opacity={0.14} />
        </group>
      ))}
    </>
  )
}

function Halo({ color, size, opacity }: { color: string; size: number; opacity: number }) {
  const texture = useMemo(() => getGlowTexture(), [])
  return (
    <sprite scale={[size, size, 1]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.NormalBlending}
        toneMapped={false}
      />
    </sprite>
  )
}

function Label({
  position,
  text,
  icon: Icon,
  accent,
}: {
  position: [number, number, number]
  text: string
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  accent: string
}) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div
        className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold text-[#0b0b0b]"
        style={{ textShadow: '0 0 6px rgba(255,255,255,0.95), 0 0 2px rgba(255,255,255,0.95)' }}
      >
        <Icon className="size-3.5" style={{ color: accent }} />
        {text}
      </div>
    </Html>
  )
}

function DataStack({ position: [x, z], animate }: { position: Vec2; animate: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = animate ? clock.elapsedTime * 0.25 : 0
  })
  const discs = [0.32, 0.92, 1.52]
  return (
    <group position={[x, 0, z]}>
      <group ref={group}>
        {discs.map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[0.78, 0.78, 0.46, 64]} />
            <Glass tint={TINT.data} />
            <Edges color={C.cyan} threshold={20} />
          </mesh>
        ))}
      </group>
      <Halo color={C.cyan} size={3.2} opacity={0.06} />
      <Label position={[0, 2.35, 0]} text="Data" icon={Database} accent={C.cyan} />
    </group>
  )
}

function AiCore({ position: [x, z], animate }: { position: Vec2; animate: boolean }) {
  const strip = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (strip.current) strip.current.opacity = animate ? 0.55 + Math.sin(clock.elapsedTime * 1.6) * 0.3 : 0.7
  })
  const w = 11
  const h = 0.42
  const d = 1.4
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[w, h, d]} radius={0.12} smoothness={4} position={[0, h / 2, 0]}>
        <Glass tint={TINT.ai} />
        <Edges color={C.blue} threshold={20} />
      </RoundedBox>
      <mesh position={[0, h + 0.004, d / 2 - 0.14]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.6, 0.04]} />
        <meshBasicMaterial ref={strip} color={C.sky} transparent opacity={0.7} toneMapped={false} />
      </mesh>

      <NeuralNetwork position={[0, 1.75, 0]} animate={animate} />

      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.75, 8]} />
        <meshBasicMaterial color={C.sky} transparent opacity={0.45} toneMapped={false} />
      </mesh>
      <Label position={[0, 2.95, 0]} text="AI" icon={BrainCircuit} accent={C.sky} />
    </group>
  )
}

const NN_LAYERS = [3, 5, 5, 2]
const NN_LAYER_GAP = 0.78
const NN_NODE_GAP = 0.3
const NN_CYCLE = NN_LAYERS.length + 0.8 

function NeuralNetwork({ position, animate }: { position: [number, number, number]; animate: boolean }) {
  const group = useRef<THREE.Group>(null)

  const layers = useMemo(
    () =>
      NN_LAYERS.map((count, li) =>
        Array.from(
          { length: count },
          (_, i) =>
            new THREE.Vector3(
              (li - (NN_LAYERS.length - 1) / 2) * NN_LAYER_GAP,
              (i - (count - 1) / 2) * NN_NODE_GAP,
              ((i % 2) - 0.5) * 0.12 
            )
        )
      ),
    []
  )
  const edges = useMemo(() => {
    const list: Array<{ from: THREE.Vector3; to: THREE.Vector3; layer: number }> = []
    for (let li = 0; li < layers.length - 1; li++)
      for (const a of layers[li]) for (const b of layers[li + 1]) list.push({ from: a, to: b, layer: li })
    return list
  }, [layers])
  const edgeGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setFromPoints(edges.flatMap((e) => [e.from, e.to]))
    return g
  }, [edges])

  const nodeRefs = useRef<Array<THREE.Mesh | null>>([])
  const signalRefs = useRef<Array<THREE.Mesh | null>>([])
  const flat = useMemo(() => layers.flatMap((nodes, li) => nodes.map((p) => ({ p, li }))), [layers])
  const ink = useMemo(() => new THREE.Color(C.blue), [])
  const grey = useMemo(() => new THREE.Color(C.ice), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (group.current) {
      group.current.rotation.y = animate ? Math.sin(t * 0.35) * 0.45 : 0.25
      group.current.position.y = position[1] + (animate ? Math.sin(t * 0.8) * 0.06 : 0)
    }
    const wave = animate ? (t * 1.1) % NN_CYCLE : -10

    flat.forEach(({ li }, i) => {
      const node = nodeRefs.current[i]
      if (!node) return
      const act = Math.max(0, 1 - Math.abs(wave - li) * 1.4)
      node.scale.setScalar(1 + act * 0.55)
      ;(node.material as THREE.MeshStandardMaterial).color.copy(grey).lerp(ink, animate ? 0.35 + act * 0.65 : 0.7)
    })

    edges.forEach((e, i) => {
      const dot = signalRefs.current[i]
      if (!dot) return
      const f = wave - e.layer 
      if (f > 0 && f < 1) {
        tmp.copy(e.from).lerp(e.to, f)
        dot.position.copy(tmp)
        dot.visible = true
        dot.scale.setScalar(Math.sin(f * Math.PI))
      } else {
        dot.visible = false
      }
    })
  })

  return (
    <group ref={group} position={position}>
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial color={C.ice} transparent opacity={0.9} />
      </lineSegments>

      {flat.map(({ p }, i) => (
        <mesh key={i} position={p} ref={(el) => { nodeRefs.current[i] = el }}>
          <sphereGeometry args={[0.065, 20, 20]} />
          <meshStandardMaterial color={C.cyan} roughness={0.35} metalness={0.1} />
        </mesh>
      ))}

      {edges.map((_, i) => (
        <mesh key={i} ref={(el) => { signalRefs.current[i] = el }} visible={false}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshBasicMaterial color={C.blue} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Lakehouse({ position: [x, z], animate }: { position: Vec2; animate: boolean }) {
  const mid = useRef<THREE.Group>(null)
  const top = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const s = animate ? (Math.sin(clock.elapsedTime * 1.1) + 1) / 2 : 0.5
    if (mid.current) mid.current.position.y = 0.52 + s * 0.06
    if (top.current) top.current.position.y = 0.94 + s * 0.14
  })
  const size = 1.8
  const t = 0.16
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[size, t, size]} radius={0.06} smoothness={4} position={[0, t / 2 + 0.02, 0]}>
        <meshStandardMaterial color={C.primary} roughness={0.4} metalness={0.1} />
      </RoundedBox>
      <group ref={mid}>
        <RoundedBox args={[size, t, size]} radius={0.06} smoothness={4}>
          <Glass tint={TINT.lake} />
          <Edges color={C.sky} threshold={20} />
        </RoundedBox>
      </group>
      <group ref={top}>
        <RoundedBox args={[size, t, size]} radius={0.06} smoothness={4}>
          <Glass tint={TINT.lakeTop} />
          <Edges color={C.ice} threshold={20} />
        </RoundedBox>
      </group>
      <Halo color={C.blue} size={4} opacity={0.06} />
      <Label position={[0, 1.65, 0]} text="Metadata lakehouse" icon={Layers} accent={C.sky} />
    </group>
  )
}

function Outlet({
  position: [x, z],
  label,
  icon,
  accent,
  tint,
  animate,
  phase,
}: {
  position: Vec2
  label: string
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  accent: string
  tint: string
  animate: boolean
  phase: number
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = animate ? Math.sin(clock.elapsedTime * 1.2 + phase) * 0.05 : 0
  })
  const w = 1.5
  const h = 0.7
  const d = 1.2
  return (
    <group position={[x, 0, z]}>
      <group ref={ref}>
        <RoundedBox args={[w, h, d]} radius={0.12} smoothness={4} position={[0, h / 2 + 0.05, 0]}>
          <Glass tint={tint} />
          <Edges color={accent} threshold={20} />
        </RoundedBox>
        <mesh position={[0, h + 0.056, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.5, d - 0.5]} />
          <meshBasicMaterial color={accent} transparent opacity={0.08} toneMapped={false} />
        </mesh>
      </group>
      <Halo color={accent} size={2.6} opacity={0.05} />
      <Label position={[0, h + 0.6, 0]} text={label} icon={icon} accent={accent} />
    </group>
  )
}

let glowTexture: THREE.CanvasTexture | null = null
function getGlowTexture(): THREE.CanvasTexture {
  if (!glowTexture) {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    glowTexture = new THREE.CanvasTexture(canvas)
  }
  return glowTexture
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const onChange = () => setReduce(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduce
}
