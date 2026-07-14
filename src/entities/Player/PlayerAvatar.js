import * as THREE from 'three'
import Component from '../../Component'

function createShirtLogo() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 1024, 512);
  gradient.addColorStop(0, '#58e8ff');
  gradient.addColorStop(.5, '#387bd6');
  gradient.addColorStop(1, '#8450df');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  for (let x = -80; x < 1100; x += 130) {
    ctx.fillRect(x, 0, 46, 512);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 104px Arial';
  ctx.fillText('SIGNAL', 512, 180);
  ctx.font = '900 185px Arial';
  ctx.fillText('RUN', 512, 336);
  ctx.fillStyle = '#fff4a4';
  ctx.font = '600 42px monospace';
  ctx.fillText('OWN THE RUN', 512, 420);
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function shadowed(material) {
  material.roughness = 0.55;
  material.metalness = 0.15;
  return material;
}

export default class PlayerAvatar extends Component {
  constructor(scene) {
    super();
    this.name = 'PlayerAvatar';
    this.scene = scene;
    this.walkTime = 0;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
  }

  mesh(geometry, material, position, parent = this.avatar) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  createLeg(side, materials) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.18, 0.78, 0);
    this.avatar.add(leg);

    // Segmented leg parts: Thigh, Shin, Boot (rotated from Hip joint origin)
    this.mesh(new THREE.CylinderGeometry(0.11, 0.10, 0.38, 8), materials.trousers, [0, -0.19, 0], leg);
    this.mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.38, 8), materials.trousers, [0, -0.57, 0], leg);
    this.mesh(new THREE.BoxGeometry(0.18, 0.12, 0.28), materials.boots, [0, -0.76, -0.05], leg);

    return leg;
  }

  createArm(side, materials) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.32, 1.44, 0);
    this.avatar.add(arm);

    // Segmented arm parts: Shoulder joint, Upper arm, Lower arm, Hand
    this.mesh(new THREE.SphereGeometry(0.09, 8, 8), materials.shirt, [0, 0, 0], arm);
    this.mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.36, 8), materials.shirt, [0, -0.18, 0], arm);
    this.mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.34, 8), materials.skin, [0, -0.53, 0], arm);
    
    // Hand block (where weapons attach or align)
    this.mesh(new THREE.BoxGeometry(0.10, 0.10, 0.10), materials.skin, [0, -0.72, 0], arm);

    return arm;
  }

  Initialize() {
    this.avatar = new THREE.Group();
    this.avatar.name = 'SignalRunPlayerAvatar';
    
    // Determine loadout styles from global state
    const loadout = window.game && window.game.loadout ? window.game.loadout : { shirt: 'default', pants: 'default', head: 'default' };
    const shirtStyle = loadout.shirt;
    const pantsStyle = loadout.pants;
    const headStyle = loadout.head;

    const shirtUnlocked = shirtStyle === 'signal-run';
    const pantsUnlocked = pantsStyle === 'signal-run';
    const headUnlocked = headStyle === 'signal-run';

    // Define colors dynamically based on selections
    let shirtColor = '#7f8c8d'; // default grey
    if (shirtStyle === 'signal-run') shirtColor = '#387bd6';
    else if (shirtStyle === 'stealth') shirtColor = '#2c3e50';
    else if (shirtStyle === 'medic') shirtColor = '#ecf0f1';

    let pantsColor = '#4b5563'; // default slate
    if (pantsStyle === 'signal-run') pantsColor = '#8455e2';
    else if (pantsStyle === 'cargo') pantsColor = '#d35400';
    else if (pantsStyle === 'greaves') pantsColor = '#2c3e50';

    let headColor = '#d7a576'; // default skin tone
    if (headStyle === 'signal-run') headColor = '#62e9ff';
    else if (headStyle === 'ninja') headColor = '#1e293b';

    const materials = {
      shirt: shadowed(new THREE.MeshStandardMaterial({ color: shirtColor })),
      skin: shadowed(new THREE.MeshStandardMaterial({ color: '#d7a576' })),
      hair: shadowed(new THREE.MeshStandardMaterial({ color: '#1e272e' })),
      trousers: shadowed(new THREE.MeshStandardMaterial({ color: pantsColor })),
      boots: shadowed(new THREE.MeshStandardMaterial({ color: pantsStyle === 'signal-run' ? '#62e9ff' : '#101827' })),
      glow: new THREE.MeshStandardMaterial({ color: '#baffff', emissive: '#5be7ff', emissiveIntensity: 1.4 }),
      greenGlow: new THREE.MeshStandardMaterial({ color: '#baffff', emissive: '#2ecc71', emissiveIntensity: 1.6 }),
      redCross: new THREE.MeshBasicMaterial({ color: '#e74c3c' }),
      hood: shadowed(new THREE.MeshStandardMaterial({ color: '#1e272e' })),
      headGear: shadowed(new THREE.MeshStandardMaterial({
        color: headColor,
        emissive: headStyle === 'signal-run' ? '#00b3d6' : '#000000',
        emissiveIntensity: headStyle === 'signal-run' ? 0.8 : 0
      }))
    };

    // Instantiate Segmented Legs
    this.leftLeg = this.createLeg(-1, materials);
    this.rightLeg = this.createLeg(1, materials);
    
    // Pelvis/Hips box connects legs and torso:
    this.mesh(new THREE.BoxGeometry(0.50, 0.18, 0.30), materials.trousers, [0, 0.82, 0]);

    // Segmented Torso (Abdomen + Chest + Neck)
    this.mesh(new THREE.BoxGeometry(0.44, 0.30, 0.26), materials.shirt, [0, 1.05, 0]);
    this.mesh(new THREE.BoxGeometry(0.54, 0.38, 0.30), materials.shirt, [0, 1.34, 0]);
    this.mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 8), materials.skin, [0, 1.58, 0]);
    
    // Head Base
    this.mesh(new THREE.BoxGeometry(0.28, 0.30, 0.28), materials.skin, [0, 1.78, 0]);
    
    // Human Face Details: Ears, Nose, Hair, Eyes
    this.mesh(new THREE.BoxGeometry(0.04, 0.08, 0.06), materials.skin, [-0.15, 1.78, 0]); // Left Ear
    this.mesh(new THREE.BoxGeometry(0.04, 0.08, 0.06), materials.skin, [0.15, 1.78, 0]);  // Right Ear
    this.mesh(new THREE.BoxGeometry(0.05, 0.08, 0.06), materials.skin, [0, 1.75, -0.15]); // Nose
    this.mesh(new THREE.BoxGeometry(0.30, 0.06, 0.32), materials.hair, [0, 1.94, 0]);    // Hair Cap
    this.mesh(new THREE.BoxGeometry(0.06, 0.10, 0.32), materials.hair, [0, 1.96, -0.02]);   // Hair Mohawk
    this.mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), materials.glow, [-0.06, 1.82, -0.15]); // Left Eye
    this.mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), materials.glow, [0.06, 1.82, -0.15]);  // Right Eye
    
    // Extra Accessories (Procedural block styling)
    if (shirtStyle === 'medic') {
      this.mesh(new THREE.BoxGeometry(.12, .32, .02), materials.redCross, [0, 1.34, .16]);
      this.mesh(new THREE.BoxGeometry(.32, .12, .02), materials.redCross, [0, 1.34, .16]);
      
      this.mesh(new THREE.BoxGeometry(.12, .32, .02), materials.redCross, [0, 1.34, -.16]);
      this.mesh(new THREE.BoxGeometry(.32, .12, .02), materials.redCross, [0, 1.34, -.16]);
    } else if (shirtStyle === 'stealth') {
      this.mesh(new THREE.BoxGeometry(.38, .38, .22), materials.hood, [0, 1.54, .18]);
    }

    if (pantsStyle === 'cargo') {
      this.mesh(new THREE.BoxGeometry(.08, .18, .18), materials.trousers, [-.24, 0.60, 0]);
      this.mesh(new THREE.BoxGeometry(.08, .18, .18), materials.trousers, [.24, 0.60, 0]);
    } else if (pantsStyle === 'greaves') {
      this.mesh(new THREE.BoxGeometry(.12, .28, .04), materials.glow, [-.18, 0.24, -.11]);
      this.mesh(new THREE.BoxGeometry(.12, .28, .04), materials.glow, [.18, 0.24, -.11]);
    }

    if (headUnlocked) {
      // Visor
      this.mesh(new THREE.BoxGeometry(.36, .10, .14), materials.glow, [0, 1.82, -.16]);
      // Helmet Cap
      this.mesh(new THREE.CylinderGeometry(.22, .22, .12, 12), materials.trousers, [0, 2.02, -.01]);
    } else if (headStyle === 'nvg') {
      this.mesh(new THREE.BoxGeometry(.32, .06, .32), materials.trousers, [0, 1.82, -.01]);
      const l1 = this.mesh(new THREE.CylinderGeometry(.04, .04, .08, 8), materials.greenGlow, [-.06, 1.84, -.22]);
      l1.rotation.x = Math.PI * 0.5;
      const l2 = this.mesh(new THREE.CylinderGeometry(.04, .04, .08, 8), materials.greenGlow, [.06, 1.84, -.22]);
      l2.rotation.x = Math.PI * 0.5;
    } else if (headStyle === 'ninja') {
      this.mesh(new THREE.BoxGeometry(.30, 0.16, .30), materials.trousers, [0, 1.70, -.01]);
    }

    this.leftArm = this.createArm(-1, materials);
    this.rightArm = this.createArm(1, materials);

    // The logo is a separate rear panel, so the third-person follow camera always sees it printed on the worn shirt.
    const logoMaterial = new THREE.MeshBasicMaterial({ map: createShirtLogo(), side: THREE.DoubleSide });
    this.logo = this.mesh(new THREE.PlaneGeometry(.45, .225), logoMaterial, [0, 1.34, .16]);
    this.logo.renderOrder = 2;
    this.logo.visible = shirtUnlocked;

    this.scene.add(this.avatar);
    this.controls = this.GetComponent('PlayerControls');

    // Remove debug div if present
    const oldDebug = document.getElementById('avatar-debug');
    if (oldDebug) oldDebug.remove();

    // Attach weapon to right arm since PlayerAvatar is initialized after Weapon
    const weapon = this.GetComponent('Weapon');
    if (weapon && weapon.model) {
        this.rightArm.add(weapon.model);
        
        // Hide the camouflage first-person arms mesh inside the weapon model
        weapon.model.traverse(child => {
          if (child.isMesh) {
            const mat = child.material;
            let isArmsOrHands = false;
            
            if (mat) {
              const mats = Array.isArray(mat) ? mat : [mat];
              mats.forEach(m => {
                const matName = (m.name || '').toLowerCase();
                if (
                  matName.includes('arm') || 
                  matName.includes('hand') || 
                  matName.includes('sleeve')
                ) {
                  isArmsOrHands = true;
                }
              });
            }
            
            if (isArmsOrHands) {
              child.visible = false;
            } else {
              child.visible = true; // Ensure the gun meshes (Material.002) remain visible
            }
          }
        });
        
        // Position the weapon directly inside the right hand block
        weapon.model.position.set(0.0, -0.70, 0.10);
        weapon.model.scale.set(0.095, 0.095, 0.095); // Scale matching character size
        weapon.model.setRotationFromEuler(new THREE.Euler(
            -Math.PI * 0.5, 
            Math.PI, 
            0
        ));
        weapon.model.visible = true;
    }
  }

  Update(t) {
    if (!this.avatar) return;
    const position = this.parent.Position;
    this.avatar.position.set(position.x, position.y - .95, position.z);
    this.euler.setFromQuaternion(this.parent.Rotation, 'YXZ');
    this.avatar.rotation.y = this.euler.y;

    const speed = this.controls.speed.length();
    this.walkTime += t * Math.max(2.4, speed * 2.2);
    const swing = Math.sin(this.walkTime) * Math.min(.55, speed * .1);
    
    // Segmented Legs swing naturally from the hips
    this.leftLeg.rotation.x = -swing;
    this.rightLeg.rotation.x = swing;

    // Bobbing for arms
    const bob = Math.sin(this.walkTime) * Math.min(0.04, speed * 0.015);

    // Get weapon recoil from Weapon component
    const weapon = this.parent.GetComponent('Weapon');
    let recoil = 0;
    if (weapon && weapon.shoot && weapon.magAmmo > 0) {
      recoil = Math.max(0, weapon.shootTimer / weapon.fireRate);
    }

    // Two-handed aiming combat stance:
    // Right arm holds the grip and takes the recoil kickback (Z translation backward)
    this.rightArm.rotation.x = Math.PI * 0.43 + bob + (recoil * 0.12);
    this.rightArm.rotation.y = -Math.PI * 0.08;
    this.rightArm.rotation.z = -Math.PI * 0.05;
    this.rightArm.position.set(0.32, 1.44, recoil * 0.06);

    // Left arm supports the barrel of the gun
    this.leftArm.rotation.x = Math.PI * 0.38 + bob + (recoil * 0.08);
    this.leftArm.rotation.y = Math.PI * 0.16;
    this.leftArm.rotation.z = Math.PI * 0.10;
    this.leftArm.position.set(-0.32, 1.44, 0);
  }
}
