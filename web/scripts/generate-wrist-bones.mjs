#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = buffer
        this.onloadend?.()
      })
    }

    readAsDataURL(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = `data:${blob.type || ''};base64,${Buffer.from(buffer).toString('base64')}`
        this.onloadend?.()
      })
    }
  }
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const webDirectory = path.resolve(scriptDirectory, '..')
const defaultBodyParts3dRoot =
  '/private/tmp/bodyparts3d.25PsLE/assets/BodyParts3D_data'
const bodyParts3dRoot =
  process.env.BP3D_DATA_DIR || process.argv[2] || defaultBodyParts3dRoot
const stlDirectory = path.join(bodyParts3dRoot, 'stl')
const outputDirectory = path.join(
  webDirectory,
  'public/models/wrist/bones',
)

const structures = [
  ['left_radius', 'Radius', 'FMA23465'],
  ['left_ulna', 'Ulna', 'FMA23468'],
  ['left_scaphoid', 'Scaphoid', 'FMA24436'],
  ['left_lunate', 'Lunate', 'FMA24438'],
  ['left_triquetrum', 'Triquetrum', 'FMA24440'],
  ['left_pisiform', 'Pisiform', 'FMA24442'],
  ['left_trapezium', 'Trapezium', 'FMA24444'],
  ['left_trapezoid', 'Trapezoid', 'FMA24445'],
  ['left_capitate', 'Capitate', 'FMA24447'],
  ['left_hamate', 'Hamate', 'FMA24449'],
  ['left_metacarpal_1', 'First metacarpal', 'FMA24465'],
  ['left_metacarpal_2', 'Second metacarpal', 'FMA24467'],
  ['left_metacarpal_3', 'Third metacarpal', 'FMA24469'],
  ['left_metacarpal_4', 'Fourth metacarpal', 'FMA24471'],
  ['left_metacarpal_5', 'Fifth metacarpal', 'FMA24473'],
  ['left_thumb_proximal_phalanx', 'Thumb proximal phalanx', 'FMA65470'],
  ['left_thumb_distal_phalanx', 'Thumb distal phalanx', 'FMA23951'],
  ['left_index_proximal_phalanx', 'Index proximal phalanx', 'FMA71915'],
  ['left_index_middle_phalanx', 'Index middle phalanx', 'FMA23938'],
  ['left_index_distal_phalanx', 'Index distal phalanx', 'FMA23953'],
  ['left_middle_proximal_phalanx', 'Middle proximal phalanx', 'FMA71908'],
  ['left_middle_middle_phalanx', 'Middle middle phalanx', 'FMA23940'],
  ['left_middle_distal_phalanx', 'Middle distal phalanx', 'FMA23955'],
  ['left_ring_proximal_phalanx', 'Ring proximal phalanx', 'FMA71916'],
  ['left_ring_middle_phalanx', 'Ring middle phalanx', 'FMA23942'],
  ['left_ring_distal_phalanx', 'Ring distal phalanx', 'FMA23957'],
  ['left_little_proximal_phalanx', 'Little proximal phalanx', 'FMA66791'],
  ['left_little_middle_phalanx', 'Little middle phalanx', 'FMA23944'],
  ['left_little_distal_phalanx', 'Little distal phalanx', 'FMA23959'],
]

fs.mkdirSync(outputDirectory, { recursive: true })

console.log('Discovered BodyParts3D wrist/hand mapping:')
for (const [id, label, fmaId] of structures) {
  console.log(`${id}: ${label} (${fmaId})`)
}

const loader = new STLLoader()

for (const [id, label, fmaId] of structures) {
  const inputPath = path.join(stlDirectory, `${fmaId}.stl`)
  const outputPath = path.join(outputDirectory, `${id}.glb`)

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing STL for ${id}: ${inputPath}`)
  }

  const buffer = fs.readFileSync(inputPath)
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
  const geometry = loader.parse(arrayBuffer)

  geometry.rotateX(-Math.PI / 2)
  geometry.scale(0.001, 0.001, 0.001)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0xe9e1d1,
      roughness: 0.8,
      metalness: 0,
    }),
  )
  mesh.name = id
  mesh.userData = { anatomyLabel: label, fmaId }

  const scene = new THREE.Scene()
  scene.name = `${id}_scene`
  scene.add(mesh)

  const glb = await new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      scene,
      (result) => resolve(Buffer.from(result)),
      (error) => reject(error),
      { binary: true },
    )
  })

  fs.writeFileSync(outputPath, glb)
  console.log(
    `Wrote ${path.relative(webDirectory, outputPath)} (${Math.round(glb.length / 1024)} KB)`,
  )
}
