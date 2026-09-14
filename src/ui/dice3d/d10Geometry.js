// src/ui/dice3d/d10Geometry.js
import * as THREE from 'three';

/**
 * Pentagonal Trapezohedron (10 sided die) Geometry Builder
 * 
 * Vertices:
 * - Top Apex: (0, H, 0)
 * - Bottom Apex: (0, -H, 0)
 * - 5 upper equatorial vertices A_k at y = +h
 * - 5 lower equatorial vertices B_k at y = -h (rotated by 36 deg)
 * 
 * Dimensions for authentic d10 proportions:
 * R = 1.0 (equatorial radius)
 * H = 1.25 (pole height)
 * h = 0.132 (equator offset for coplanar kite faces)
 */

export function createD10Geometry(radius = 1.0) {
  const R = radius;
  const H = radius * 1.25;
  const h = radius * 0.132;

  const topApex = new THREE.Vector3(0, H, 0);
  const botApex = new THREE.Vector3(0, -H, 0);

  const A = [];
  const B = [];

  for (let k = 0; k < 5; k++) {
    const theta = (2 * Math.PI * k) / 5;
    const phi = theta + Math.PI / 5;
    A.push(new THREE.Vector3(R * Math.cos(theta), h, R * Math.sin(theta)));
    B.push(new THREE.Vector3(R * Math.cos(phi), -h, R * Math.sin(phi)));
  }

  // 10 Kite Faces (each face composed of 2 triangles sharing diagonal)
  // Each face has 4 vertices: [P0 (pole), P1 (left), P2 (opposite/equator), P3 (right)]
  const kiteFaces = [];

  // 5 upper kite faces
  for (let k = 0; k < 5; k++) {
    const kNext = (k + 1) % 5;
    kiteFaces.push({
      index: k, // upper faces 0 to 4
      isUpper: true,
      p0: topApex,
      p1: A[k],
      p2: B[k],
      p3: A[kNext],
    });
  }

  // 5 lower kite faces
  for (let k = 0; k < 5; k++) {
    const kNext = (k + 1) % 5;
    kiteFaces.push({
      index: 5 + k, // lower faces 5 to 9
      isUpper: false,
      p0: botApex,
      p1: B[kNext],
      p2: A[kNext],
      p3: B[k],
    });
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const faceNormals = [];

  kiteFaces.forEach((face) => {
    // Normal vector for this kite
    const v1 = new THREE.Vector3().subVectors(face.p1, face.p0);
    const v2 = new THREE.Vector3().subVectors(face.p2, face.p0);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
    faceNormals.push(normal);

    // Triangle 1: p0, p1, p2
    // Triangle 2: p0, p2, p3
    // UV layout for kite:
    // p0 (apex): (0.5, 1.0)
    // p1 (left): (0.05, 0.45)
    // p2 (equator): (0.5, 0.0)
    // p3 (right): (0.95, 0.45)

    // Tri 1: p0, p1, p2
    positions.push(
      face.p0.x, face.p0.y, face.p0.z,
      face.p1.x, face.p1.y, face.p1.z,
      face.p2.x, face.p2.y, face.p2.z
    );
    normals.push(
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z
    );
    uvs.push(
      0.5, 1.0,
      0.05, 0.45,
      0.5, 0.0
    );

    // Tri 2: p0, p2, p3
    positions.push(
      face.p0.x, face.p0.y, face.p0.z,
      face.p2.x, face.p2.y, face.p2.z,
      face.p3.x, face.p3.y, face.p3.z
    );
    normals.push(
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z
    );
    uvs.push(
      0.5, 1.0,
      0.5, 0.0,
      0.95, 0.45
    );
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  // Also build edges geometry for crisp facet highlighting
  const edgesGeom = new THREE.EdgesGeometry(geometry, 15);

  return { geometry, edgesGeom, faceNormals, kiteFaces };
}

/**
 * Calculates the quaternion rotation needed so that face `faceIndex` (0 to 9)
 * points directly along the camera viewing vector (0, 0, 1) with slight upward tilt.
 */
export function getRotationForFace(faceNormal) {
  // Target direction: towards viewer (+Z), slightly tilted upward for ideal readability
  const targetDir = new THREE.Vector3(0, 0.15, 0.98).normalize();
  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(faceNormal, targetDir);
  return quat;
}
