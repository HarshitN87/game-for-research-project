import Component from '../../Component'
import * as THREE from 'three'
import {Ammo, createConvexHullShape} from '../../AmmoLib'

function createFloorTextures() {
    // Diffuse canvas: dark textured metallic floor
    const canvasD = document.createElement('canvas');
    canvasD.width = 512;
    canvasD.height = 512;
    const ctxD = canvasD.getContext('2d');
    
    // Base dark slate metallic color
    ctxD.fillStyle = '#0b1424';
    ctxD.fillRect(0, 0, 512, 512);
    
    // Add micro-noise
    for (let i = 0; i < 60000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const val = Math.random() * 20;
        ctxD.fillStyle = `rgba(${val}, ${val}, ${val + 10}, 0.12)`;
        ctxD.fillRect(x, y, 1, 1);
    }
    
    // Draw grid lines
    ctxD.strokeStyle = 'rgba(99, 236, 255, 0.15)';
    ctxD.lineWidth = 3;
    ctxD.strokeRect(0, 0, 512, 512);
    ctxD.beginPath();
    ctxD.moveTo(256, 0); ctxD.lineTo(256, 512);
    ctxD.moveTo(0, 256); ctxD.lineTo(512, 256);
    ctxD.stroke();
    
    const textureD = new THREE.CanvasTexture(canvasD);
    textureD.wrapS = THREE.RepeatWrapping;
    textureD.wrapT = THREE.RepeatWrapping;
    textureD.repeat.set(30, 30); // Tile it across the floor
    
    // Normal map canvas: generate normal map from grid and noise
    const canvasN = document.createElement('canvas');
    canvasN.width = 512;
    canvasN.height = 512;
    const ctxN = canvasN.getContext('2d');
    
    // Base normal map color (neutral Z-up normal: 128, 128, 255)
    ctxN.fillStyle = '#8080ff';
    ctxN.fillRect(0, 0, 512, 512);
    
    // Add micro-noise to normal map for metal roughness/noise
    const imgData = ctxN.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const nx = 128 + (Math.random() - 0.5) * 12;
        const ny = 128 + (Math.random() - 0.5) * 12;
        data[i] = nx;     // R
        data[i+1] = ny;   // G
        data[i+2] = 255;  // B (Z axis stays strong)
    }
    ctxN.putImageData(imgData, 0, 0);
    
    // Draw bevels for grid lines in normal map (normal changes on borders)
    ctxN.strokeStyle = 'rgb(110, 110, 255)';
    ctxN.lineWidth = 6;
    ctxN.strokeRect(0, 0, 512, 512);
    ctxN.beginPath();
    ctxN.moveTo(256, 0); ctxN.lineTo(256, 512);
    ctxN.moveTo(0, 256); ctxN.lineTo(512, 256);
    ctxN.stroke();
    
    const textureN = new THREE.CanvasTexture(canvasN);
    textureN.wrapS = THREE.RepeatWrapping;
    textureN.wrapT = THREE.RepeatWrapping;
    textureN.repeat.set(30, 30);
    
    return { map: textureD, normalMap: textureN };
}

export default class LevelSetup extends Component{
    constructor(mesh, scene, physicsWorld){
        super();
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.name = 'LevelSetup';
        this.mesh = mesh;
    }

    LoadScene(){
        
        this.mesh.traverse( ( node ) => {
            if ( node.isMesh || node.isLight ) { node.castShadow = true; }
            if(node.isMesh){ 
                node.receiveShadow = true; 
                this.SetStaticCollider(node);

                // Identify if this is the floor mesh and update material
                node.geometry.computeBoundingBox();
                const bbox = node.geometry.boundingBox;
                const isFloor = node.name.toLowerCase().includes('floor') || 
                                node.name.toLowerCase().includes('ground') || 
                                node.name.toLowerCase().includes('plane') ||
                                (bbox && (bbox.max.y - bbox.min.y) < 0.2 && (bbox.max.x - bbox.min.x) > 10);
                
                if (isFloor) {
                    const floorTexs = createFloorTextures();
                    node.material = new THREE.MeshStandardMaterial({
                        map: floorTexs.map,
                        normalMap: floorTexs.normalMap,
                        roughness: 0.35,
                        metalness: 0.75,
                        color: new THREE.Color(0.8, 0.8, 0.8)
                    });
                }
            }

            if(node.isLight){
                node.intensity = 3;
                const shadow = node.shadow;
                const lightCam = shadow.camera;

                shadow.mapSize.width = 1024 * 3;
                shadow.mapSize.height = 1024 * 3;
                shadow.bias = -0.00007;

                const dH = 35, dV = 35;
                lightCam.left = -dH;
                lightCam.right = dH;
                lightCam.top = dV;
                lightCam.bottom = -dV;

                //const cameraHelper = new THREE.CameraHelper(lightCam);
                //this.scene.add(cameraHelper);
            }
        });

        this.scene.add( this.mesh );
    }


    SetStaticCollider(mesh){
        const shape = createConvexHullShape(mesh);
        const mass = 0;
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        const motionState = new Ammo.btDefaultMotionState(transform);

        const localInertia = new Ammo.btVector3(0,0,0);
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
        const object = new Ammo.btRigidBody(rbInfo);
        object.parentEntity = this.parent;
        object.mesh = mesh;
  
        this.physicsWorld.addRigidBody(object);
    }

    Initialize(){
        this.LoadScene();
    }
}