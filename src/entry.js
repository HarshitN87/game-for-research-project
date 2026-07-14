/**
 * entry.js
 * 
 * This is the first file loaded. It sets up the Renderer, 
 * Scene, Physics and Entities. It also starts the render loop and 
 * handles window resizes.
 * 
 */

import * as THREE from 'three'
import {AmmoHelper, Ammo, createConvexHullShape} from './AmmoLib'
import EntityManager from './EntityManager'
import Entity from './Entity'
import Sky from './entities/Sky/Sky2'
import LevelSetup from './entities/Level/LevelSetup'
import PlayerControls from './entities/Player/PlayerControls'
import PlayerPhysics from './entities/Player/PlayerPhysics'
import Stats from 'three/examples/jsm/libs/stats.module'
import {  FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import {  GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import {  OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import {  SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils'
import NpcCharacterController from './entities/NPC/CharacterController'
import Input from './Input'

import level from './assets/level.glb'
import navmesh from './assets/navmesh.obj'
import playerModel from './assets/Punk.fbx'
import punkBody from './assets/Punk_Body.fbx'
import punkLegs from './assets/Punk_Legs.fbx'
import punkHead from './assets/Punk_Head.fbx'
import punkFeet from './assets/Punk_Feet.fbx'

import mutant from './assets/animations/mutant.fbx'
import idleAnim from './assets/animations/mutant breathing idle.fbx'
import attackAnim from './assets/animations/Mutant Punch.fbx'
import walkAnim from './assets/animations/mutant walking.fbx'
import runAnim from './assets/animations/mutant run.fbx'
import dieAnim from './assets/animations/mutant dying.fbx'

//AK47 Model and textures
import ak47 from './assets/guns/ak47/ak47.glb'
import muzzleFlash from './assets/muzzle_flash.glb'
//Shot sound
import ak47Shot from './assets/sounds/ak47_shot.wav'

//Ammo box
import ammobox from './assets/ammo/AmmoBox.fbx'
import ammoboxTexD from './assets/ammo/AmmoBox_D.tga.png'
import ammoboxTexN from './assets/ammo/AmmoBox_N.tga.png'
import ammoboxTexM from './assets/ammo/AmmoBox_M.tga.png'
import ammoboxTexR from './assets/ammo/AmmoBox_R.tga.png'
import ammoboxTexAO from './assets/ammo/AmmoBox_AO.tga.png'

//Bullet Decal
import decalColor from './assets/decals/decal_c.jpg'
import decalNormal from './assets/decals/decal_n.jpg'
import decalAlpha from './assets/decals/decal_a.jpg'

//Sky
import skyTex from './assets/sky.jpg'

import DebugDrawer from './DebugDrawer'
import Navmesh from './entities/Level/Navmesh'
import AttackTrigger from './entities/NPC/AttackTrigger'
import DirectionDebug from './entities/NPC/DirectionDebug'
import CharacterCollision from './entities/NPC/CharacterCollision'
import Weapon from './entities/Player/Weapon'
import UIManager from './entities/UI/UIManager'
import AmmoBox from './entities/AmmoBox/AmmoBox'
import LevelBulletDecals from './entities/Level/BulletDecals'
import PlayerHealth from './entities/Player/PlayerHealth'
import PlayerAvatar from './entities/Player/PlayerAvatar'
import StudyFlow from './StudyFlow'

class FPSGameApp{

  constructor(){
    window.game = this;
    this.lastFrameTime = null;
    this.assets = {};
    this.animFrameId = 0;
    this.studyFlow = new StudyFlow(this);

    AmmoHelper.Init(()=>{this.Init();});
  }

  Init(){
    this.LoadAssets();
    this.SetupGraphics();
    this.SetupStartButton();
    window.addEventListener('fps-enemy-defeated', this.OnEnemyDefeated);
  }

  SetupGraphics(){
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.camera = new THREE.PerspectiveCamera();
    this.camera.near = 0.01;

    // create an AudioListener and add it to the camera
    this.listener = new THREE.AudioListener();
    this.camera.add( this.listener );

    // renderer
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.WindowResizeHanlder();
    window.addEventListener('resize', this.WindowResizeHanlder);

    document.body.appendChild( this.renderer.domElement );

    // Stats.js
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }

  SetupPhysics() {
    // Physics configuration
    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
    const broadphase = new Ammo.btDbvtBroadphase();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
    this.physicsWorld.setGravity( new Ammo.btVector3( 0.0, -9.81, 0.0 ) );
    const fp = Ammo.addFunction(this.PhysicsUpdate);
    this.physicsWorld.setInternalTickCallback(fp);
    this.physicsWorld.getBroadphase().getOverlappingPairCache().setInternalGhostPairCallback(new Ammo.btGhostPairCallback());
  }

  SetAnim(name, obj){
    const clip = obj.animations[0];
    this.mutantAnims[name] = clip;
  }

  PromiseProgress(proms, progress_cb){
    let d = 0;
    progress_cb(0);
    for (const p of proms) {
      p.then(()=> {    
        d++;
        progress_cb( (d / proms.length) * 100 );
      });
    }
    return Promise.all(proms);
  }

  AddAsset(asset, loader, name){
    return loader.loadAsync(asset).then( result =>{
      this.assets[name] = result;
    });
  }

  OnProgress(p){
    const progressbar = document.getElementById('progress');
    progressbar.style.width = `${p}%`;
  }

  HideProgress(){
    this.OnProgress(0);
  }

  SetupStartButton(){
    // The study flow owns the participant-facing start controls.
  }

  ShowMenu(){}

  async LoadAssets(){
    const gltfLoader = new GLTFLoader();
    const fbxLoader = new FBXLoader();
    const objLoader = new OBJLoader();
    const audioLoader = new THREE.AudioLoader();
    const texLoader = new THREE.TextureLoader();
    const promises = [];

    //Level
    promises.push(this.AddAsset(level, gltfLoader, "level"));
    promises.push(this.AddAsset(navmesh, objLoader, "navmesh"));
    //Mutant
    promises.push(this.AddAsset(mutant, fbxLoader, "mutant"));
    promises.push(this.AddAsset(idleAnim, fbxLoader, "idleAnim"));
    promises.push(this.AddAsset(walkAnim, fbxLoader, "walkAnim"));
    promises.push(this.AddAsset(runAnim, fbxLoader, "runAnim"));
    promises.push(this.AddAsset(attackAnim, fbxLoader, "attackAnim"));
    promises.push(this.AddAsset(dieAnim, fbxLoader, "dieAnim"));
    //AK47
    promises.push(this.AddAsset(ak47, gltfLoader, "ak47"));
    promises.push(this.AddAsset(muzzleFlash, gltfLoader, "muzzleFlash"));
    promises.push(this.AddAsset(ak47Shot, audioLoader, "ak47Shot"));
    //Ammo box
    promises.push(this.AddAsset(ammobox, fbxLoader, "ammobox"));
    promises.push(this.AddAsset(ammoboxTexD, texLoader, "ammoboxTexD"));
    promises.push(this.AddAsset(ammoboxTexN, texLoader, "ammoboxTexN"));
    promises.push(this.AddAsset(ammoboxTexM, texLoader, "ammoboxTexM"));
    promises.push(this.AddAsset(ammoboxTexR, texLoader, "ammoboxTexR"));
    promises.push(this.AddAsset(ammoboxTexAO, texLoader, "ammoboxTexAO"));
    //Decal
    promises.push(this.AddAsset(decalColor, texLoader, "decalColor"));
    promises.push(this.AddAsset(decalNormal, texLoader, "decalNormal"));
    promises.push(this.AddAsset(decalAlpha, texLoader, "decalAlpha"));

    promises.push(this.AddAsset(skyTex, texLoader, "skyTex"));
    promises.push(this.AddAsset(playerModel, fbxLoader, "playerModel"));
    promises.push(this.AddAsset(punkBody, fbxLoader, "punkBody"));
    promises.push(this.AddAsset(punkLegs, fbxLoader, "punkLegs"));
    promises.push(this.AddAsset(punkHead, fbxLoader, "punkHead"));
    promises.push(this.AddAsset(punkFeet, fbxLoader, "punkFeet"));

    await this.PromiseProgress(promises, this.OnProgress);

    this.assets['level'] = this.assets['level'].scene;
    this.assets['muzzleFlash'] = this.assets['muzzleFlash'].scene;

    //Extract mutant anims
    this.mutantAnims = {};
    this.SetAnim('idle', this.assets['idleAnim']);
    this.SetAnim('walk', this.assets['walkAnim']);
    this.SetAnim('run', this.assets['runAnim']);
    this.SetAnim('attack', this.assets['attackAnim']);
    this.SetAnim('die', this.assets['dieAnim']);

    this.assets['ak47'].scene.animations = this.assets['ak47'].animations;
    
    //Set ammo box textures and other props
    this.assets['ammobox'].scale.set(0.01, 0.01, 0.01);
    this.assets['ammobox'].traverse(child =>{
      child.castShadow = true;
      child.receiveShadow = true;
      
      child.material = new THREE.MeshStandardMaterial({
        map: this.assets['ammoboxTexD'],
        aoMap: this.assets['ammoboxTexAO'],
        normalMap: this.assets['ammoboxTexN'],
        metalness: 1,
        metalnessMap: this.assets['ammoboxTexM'],
        roughnessMap: this.assets['ammoboxTexR'],
        color: new THREE.Color(0.4, 0.4, 0.4)
      });
      
    });

    this.assets['ammoboxShape'] = createConvexHullShape(this.assets['ammobox']);

    this.HideProgress();
    this.studyFlow.showReady();
  }

  EntitySetup(){
    this.entityManager = new EntityManager();

    const levelEntity = new Entity();
    levelEntity.SetName('Level');
    levelEntity.AddComponent(new LevelSetup(this.assets['level'], this.scene, this.physicsWorld));
    levelEntity.AddComponent(new Navmesh(this.scene, this.assets['navmesh']));
    levelEntity.AddComponent(new LevelBulletDecals(this.scene, this.assets['decalColor'], this.assets['decalNormal'], this.assets['decalAlpha']));
    this.entityManager.Add(levelEntity);

    const skyEntity = new Entity();
    skyEntity.SetName("Sky");
    skyEntity.AddComponent(new Sky(this.scene, this.assets['skyTex']));
    this.entityManager.Add(skyEntity);

    const playerEntity = new Entity();
    playerEntity.SetName("Player");
    playerEntity.AddComponent(new PlayerPhysics(this.physicsWorld, Ammo));
    playerEntity.AddComponent(new PlayerControls(this.camera, this.scene));
    playerEntity.AddComponent(new Weapon(this.camera, this.assets['ak47'].scene, this.assets['muzzleFlash'], this.physicsWorld, this.assets['ak47Shot'], this.listener ));
    playerEntity.AddComponent(new PlayerHealth());
    playerEntity.AddComponent(new PlayerAvatar(this.scene));
    playerEntity.SetPosition(new THREE.Vector3(2.14, 1.48, -1.36));
    playerEntity.SetRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -Math.PI * 0.5));
    this.entityManager.Add(playerEntity);

    const uimanagerEntity = new Entity();
    uimanagerEntity.SetName("UIManager");
    uimanagerEntity.AddComponent(new UIManager());
    this.entityManager.Add(uimanagerEntity);

    const ammoLocations = [
       [14.37, 0.0, 10.45],
       [32.77, 0.0, 33.84],
    ];

    ammoLocations.forEach((loc, i) => {
      const box = new Entity();
      box.SetName(`AmmoBox${i}`);
      box.AddComponent(new AmmoBox(this.scene, this.assets['ammobox'].clone(), this.assets['ammoboxShape'], this.physicsWorld));
      box.SetPosition(new THREE.Vector3(loc[0], loc[1], loc[2]));
      this.entityManager.Add(box);
    });

    // Call EndSetup first, so all currently added entities (Player, Level/Navmesh, UI, AmmoBoxes)
    // are fully initialized, and their components' Initialize() method runs.
    this.entityManager.EndSetup();

    const settings = this.studyFlow.roundSettings[this.studyFlow.round - 1];
    this.totalEnemiesToDefeat = settings.totalEnemies || 1;
    this.defeatedEnemiesCount = 0;
    this.spawnedEnemiesCount = 0;
    this.spawnInterval = settings.spawnRate || 0;
    this.spawnTimer = 0;
    this.maxSimultaneous = settings.maxSimultaneous || 1;

    // Save navmesh component reference
    this.navmeshComponent = levelEntity.GetComponent('Navmesh');

    // Spawn initial wave of enemies. Since EndSetup already ran, navmesh is fully initialized.
    const initialSpawnCount = Math.min(this.totalEnemiesToDefeat, this.maxSimultaneous);
    for (let i = 0; i < initialSpawnCount; i++) {
      this.SpawnEnemy();
    }

    this.scene.add(this.camera);
    this.animFrameId = window.requestAnimationFrame(this.OnAnimationFrameHandler);
  }

  StartGame = ()=>{
    window.cancelAnimationFrame(this.animFrameId);
    Input.ClearEventListners();

    //Create entities and physics
    this.scene.clear();
    this.SetupPhysics();
    this.EntitySetup();
    this.ShowMenu(false);
  }

  // resize
  WindowResizeHanlder = () => { 
    const { innerHeight, innerWidth } = window;
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  // render loop
  OnAnimationFrameHandler = (t) => {
    if(this.lastFrameTime===null){
      this.lastFrameTime = t;
    }

    const delta = t-this.lastFrameTime;
    let timeElapsed = Math.min(1.0 / 30.0, delta * 0.001);
    this.Step(timeElapsed);
    this.lastFrameTime = t;

    this.animFrameId = window.requestAnimationFrame(this.OnAnimationFrameHandler);
  }

  PhysicsUpdate = (world, timeStep)=>{
    this.entityManager.PhysicsUpdate(world, timeStep);
  }

  OnEnemyDefeated = (e) => {
    this.defeatedEnemiesCount++;
    this.UpdateTargetHUD();

    // Spawn an ammo box at the defeated enemy's position
    const npcEntity = this.entityManager.Get(e.detail.name);
    if (npcEntity) {
      const dropPos = npcEntity.Position.clone();
      dropPos.y = 0.35; // Position slightly off the floor
      
      const ammoBoxEntity = new Entity();
      ammoBoxEntity.SetName(`DroppedAmmoBox_${e.detail.name}_${Date.now()}`);
      
      const ammoBoxComponent = new AmmoBox(
        this.scene,
        this.assets['ammobox'].clone(),
        this.assets['ammoboxShape'],
        this.physicsWorld
      );
      
      ammoBoxEntity.AddComponent(ammoBoxComponent);
      ammoBoxEntity.SetPosition(dropPos);
      this.entityManager.Add(ammoBoxEntity);
      ammoBoxComponent.Initialize();
    }

    if (this.defeatedEnemiesCount >= this.totalEnemiesToDefeat) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('fps-target-defeated'));
      }, 1500);
    }
  }

  UpdateTargetHUD() {
    const targetStatus = document.getElementById('target-status');
    if (targetStatus && this.studyFlow) {
      const settings = this.studyFlow.roundSettings[this.studyFlow.round - 1];
      const remaining = this.totalEnemiesToDefeat - this.defeatedEnemiesCount;
      targetStatus.innerText = `${remaining} target${remaining !== 1 ? 's' : ''} remaining · ${settings.reward} Signal`;
    }
  }

  SpawnEnemy() {
    const settings = this.studyFlow.roundSettings[this.studyFlow.round - 1];
    let spawnPos = new THREE.Vector3();
    const playerEntity = this.entityManager.Get("Player");
    
    if (playerEntity && this.navmeshComponent) {
      let found = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        const randNode = this.navmeshComponent.GetRandomNode(playerEntity.Position, 25);
        if (randNode) {
          const dist = randNode.distanceTo(playerEntity.Position);
          if (dist > 10.0) {
            spawnPos.copy(randNode);
            found = true;
            break;
          }
        }
      }
      if (!found) {
        const baseLoc = settings.location;
        spawnPos.set(baseLoc[0] + (Math.random() - 0.5) * 10, baseLoc[1], baseLoc[2] + (Math.random() - 0.5) * 10);
      }
    } else {
      const baseLoc = settings.location;
      spawnPos.set(baseLoc[0], baseLoc[1], baseLoc[2]);
    }

    const npcEntity = new Entity();
    npcEntity.SetPosition(spawnPos);
    npcEntity.SetName(`Mutant_${this.studyFlow.round}_${this.spawnedEnemiesCount}`);
    
    const targetController = new NpcCharacterController(
      SkeletonUtils.clone(this.assets['mutant']), 
      this.mutantAnims, 
      this.scene, 
      this.physicsWorld
    );
    targetController.health = settings.health;
    
    npcEntity.AddComponent(targetController);
    npcEntity.AddComponent(new AttackTrigger(this.physicsWorld));
    npcEntity.AddComponent(new CharacterCollision(this.physicsWorld));
    npcEntity.AddComponent(new DirectionDebug(this.scene));
    
    this.entityManager.Add(npcEntity);
    
    for (const key in npcEntity.components) {
      npcEntity.components[key].Initialize();
    }
    
    this.spawnedEnemiesCount++;
  }

  Step(elapsedTime){
    this.physicsWorld.stepSimulation( elapsedTime, 10 );
    
    if (this.studyFlow && this.studyFlow.gameActive) {
      const activeEnemiesCount = this.spawnedEnemiesCount - this.defeatedEnemiesCount;
      const totalSpawned = this.spawnedEnemiesCount;
      
      if (totalSpawned < this.totalEnemiesToDefeat && activeEnemiesCount < this.maxSimultaneous) {
        if (this.spawnInterval > 0) {
          this.spawnTimer += elapsedTime;
          if (this.spawnTimer >= this.spawnInterval) {
            this.SpawnEnemy();
            this.spawnTimer = 0;
          }
        } else {
          this.SpawnEnemy();
        }
      }
    }

    this.entityManager.Update(elapsedTime);

    this.renderer.render(this.scene, this.camera);
    this.stats.update();
  }

}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
  _APP = new FPSGameApp();
});
