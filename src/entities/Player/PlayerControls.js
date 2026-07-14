import * as THREE from 'three'
import Component from '../../Component'
import Input from '../../Input'
import {Ammo} from '../../AmmoLib'

import DebugShapes from '../../DebugShapes'


export default class PlayerControls extends Component{
    constructor(camera){
        super();
        this.name = 'PlayerControls';
        this.camera = camera;

        this.timeZeroToMax = 0.08;

        this.maxSpeed = 7.0;
        this.speed = new THREE.Vector3();
        this.acceleration = this.maxSpeed / this.timeZeroToMax;
        this.decceleration = -7.0;

        this.mouseSpeed = 0.002;
        this.physicsComponent = null;
        this.isLocked = false;

        this.angles = new THREE.Euler();
        this.pitch = new THREE.Quaternion();
        this.yaw = new THREE.Quaternion();

        this.jumpVelocity = 5;
        this.cameraFocusHeight = 0.45;
        this.followDistance = 5.4;
        this.followLift = 1.0;
        this.tempVec = new THREE.Vector3();
        this.moveDir = new THREE.Vector3();
        this.playerPosition = new THREE.Vector3();
        this.lookDirection = new THREE.Vector3();
        this.cameraTarget = new THREE.Vector3();
        this.cameraDesired = new THREE.Vector3();
        this.xAxis = new THREE.Vector3(1.0, 0.0, 0.0);
        this.yAxis = new THREE.Vector3(0.0, 1.0, 0.0);
        this.firstUpdate = true;
        this.levelMesh = null;
        this.raycaster = new THREE.Raycaster();
    }

    Initialize(){
        this.physicsComponent = this.GetComponent("PlayerPhysics");
        this.physicsBody = this.physicsComponent.body;
        this.transform = new Ammo.btTransform();
        this.zeroVec = new Ammo.btVector3(0.0, 0.0, 0.0);
        this.angles.setFromQuaternion(this.parent.Rotation);
        this.UpdateRotation();

        Input.AddMouseMoveListner(this.OnMouseMove);

        document.addEventListener('pointerlockchange', this.OnPointerlockChange)

        Input.AddClickListner( () => {
            if(!this.isLocked && window.game && window.game.studyFlow && window.game.studyFlow.gameActive){
                document.body.requestPointerLock();
            }
        });
    }

    OnPointerlockChange = () => {
        if (document.pointerLockElement) {
            this.isLocked = true;
            return;
        }

        this.isLocked = false;
    }

    OnMouseMove = (event) => {
        if (!this.isLocked) {
          return;
        }
    
        const { movementX, movementY } = event
    
        this.angles.y -= movementX * this.mouseSpeed;
        this.angles.x -= movementY * this.mouseSpeed;

        this.angles.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.angles.x));

        this.UpdateRotation();
    }

    UpdateRotation(){
        this.pitch.setFromAxisAngle(this.xAxis, this.angles.x);
        this.yaw.setFromAxisAngle(this.yAxis, this.angles.y);

        this.parent.Rotation.multiplyQuaternions(this.yaw, this.pitch).normalize();
    }

    UpdateThirdPersonCamera(t, forceInstant = false){
        this.lookDirection.set(0, 0, -1).applyQuaternion(this.parent.Rotation).normalize();
        this.cameraTarget.copy(this.playerPosition).add(new THREE.Vector3(0, this.cameraFocusHeight, 0));
        
        // Calculate the right vector for over-the-shoulder shift
        const rightVec = new THREE.Vector3().crossVectors(this.lookDirection, this.yAxis).normalize();
        const shoulderOffset = 0.55; // Offset camera 0.55m to the right

        this.cameraDesired.copy(this.cameraTarget)
            .addScaledVector(this.lookDirection, -this.followDistance)
            .addScaledVector(rightVec, shoulderOffset)
            .add(new THREE.Vector3(0, this.followLift, 0));

        if (!this.levelMesh) {
            const levelEntity = this.FindEntity('Level');
            if (levelEntity) {
                const levelSetup = levelEntity.GetComponent('LevelSetup');
                if (levelSetup) {
                    this.levelMesh = levelSetup.mesh;
                }
            }
        }

        let targetPosition = this.cameraDesired.clone();
        if (this.levelMesh) {
            const rayDirection = new THREE.Vector3().subVectors(this.cameraDesired, this.cameraTarget);
            const distance = rayDirection.length();
            if (distance > 0.001) {
                rayDirection.normalize();
                this.raycaster.set(this.cameraTarget, rayDirection);
                const intersects = this.raycaster.intersectObject(this.levelMesh, true);
                if (intersects.length > 0) {
                    const hit = intersects[0];
                    if (hit.distance < distance) {
                        const offset = Math.max(0.1, hit.distance - 0.25);
                        targetPosition.copy(this.cameraTarget).addScaledVector(rayDirection, offset);
                    }
                }
            }
        }

        const currentDist = this.camera.position.distanceTo(this.cameraTarget);
        const targetDist = targetPosition.distanceTo(this.cameraTarget);

        if (forceInstant || targetDist < currentDist) {
            this.camera.position.copy(targetPosition);
        } else {
            this.camera.position.lerp(targetPosition, Math.min(1, t * 12));
        }

        const lookTarget = this.cameraTarget.clone()
            .addScaledVector(rightVec, shoulderOffset)
            .addScaledVector(this.lookDirection, 8);
        this.camera.lookAt(lookTarget);
    }

    Accelarate = (direction, t) => {
        const accel = this.tempVec.copy(direction).multiplyScalar(this.acceleration * t);
        this.speed.add(accel);
        this.speed.clampLength(0.0, this.maxSpeed);
    }

    Deccelerate = (t) => {
        const frameDeccel = this.tempVec.copy(this.speed).multiplyScalar(this.decceleration * t);
        this.speed.add(frameDeccel);
    }

    Update(t){
        if (!window.game || !window.game.studyFlow || !window.game.studyFlow.gameActive) {
            return;
        }

        const forwardFactor = Input.GetKeyDown("KeyS") - Input.GetKeyDown("KeyW");
        const rightFactor = Input.GetKeyDown("KeyD") - Input.GetKeyDown("KeyA");
        const direction = this.moveDir.set(rightFactor, 0.0, forwardFactor).normalize();

        const velocity = this.physicsBody.getLinearVelocity();

        if(Input.GetKeyDown('Space') && this.physicsComponent.canJump){
            velocity.setY(this.jumpVelocity);
            this.physicsComponent.canJump = false;
        }
        
        this.Deccelerate(t);
        this.Accelarate(direction, t);

        const moveVector = this.tempVec.copy(this.speed);
        moveVector.applyQuaternion(this.yaw);
        
        velocity.setX(moveVector.x);
        velocity.setZ(moveVector.z);

        this.physicsBody.setLinearVelocity(velocity);
        this.physicsBody.setAngularVelocity(this.zeroVec);

        const ms = this.physicsBody.getMotionState();
        if(ms){
            ms.getWorldTransform(this.transform);
            const p = this.transform.getOrigin();
            this.playerPosition.set(p.x(), p.y(), p.z());
            this.parent.SetPosition(this.playerPosition);
            if (this.firstUpdate) {
                this.UpdateThirdPersonCamera(t, true);
                this.firstUpdate = false;
            } else {
                this.UpdateThirdPersonCamera(t);
            }
        }
        
    }
}
