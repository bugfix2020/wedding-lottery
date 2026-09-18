'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface ParticleFieldProps {
  // 不再使用 isSpinning / prizeLevel / onSpinComplete
}

export function ParticleField({  }: ParticleFieldProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mountRef.current) return

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)
    camera.position.z = 20

    const container = mountRef.current
    const renderer = new THREE.WebGLRenderer({
      antialias: false, // 关闭抗锯齿提升性能
      alpha: true,
      powerPreference: 'low-power' // 低功耗模式
    })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)) // 限制 DPR
    container.appendChild(renderer.domElement)

    const updateSize = () => {
      if (!container) return
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(container)
    window.addEventListener('resize', updateSize)

    // ====== 粒子系统（精简）======
    const totalParticles = 800 // 降低数量
    const particles = new THREE.Group()
    scene.add(particles)

    interface Particle {
      mesh: THREE.Mesh
      radius: number
      speed: number
      verticalSpeed: number
      baseAngle: number
    }

    const particleList: Particle[] = []

    for (let i = 0; i < totalParticles; i++) {
      const radius = 8 + Math.random() * 12
      const speed = 0.01 + Math.random() * 0.04 // 更慢更稳
      const verticalSpeed = 0.01 + Math.random() * 0.03
      const baseAngle = Math.random() * Math.PI * 2

      const geometry = new THREE.SphereGeometry(0.06, 4, 4) // 更低面数
      const material = new THREE.MeshBasicMaterial({
        color: 0xb967ff,
        transparent: true,
        opacity: 0.6, // 可稍低，因为 additive 会叠加变亮
        blending: THREE.AdditiveBlending, // 👈 关键！
        depthWrite: false // 避免遮挡问题
      })

      const mesh = new THREE.Mesh(geometry, material)
      particleList.push({ mesh, radius, speed, verticalSpeed, baseAngle })
      particles.add(mesh)
    }

    // ====== 持续动画（无状态判断）======
    let animationId: number

    const animate = () => {
      const time = Date.now() * 0.001

      // 所有粒子持续旋转，无条件
      particleList.forEach((p, i) => {
        const angle = time * p.speed + p.baseAngle
        const height = Math.sin(time * p.verticalSpeed + i * 0.01) * 6
        p.mesh.position.set(Math.cos(angle) * p.radius, height, Math.sin(angle) * p.radius)
      })

      renderer.render(scene, camera)
      animationId = requestAnimationFrame(animate)
    }

    animate()

    // 清理
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', updateSize)
      resizeObserver.disconnect()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, []) // ⚠️ 依赖数组为空！只初始化一次

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden'
      }}
    />
  )
}
