// Imported like this here but could be done via webpack in larger projects. Just being used as a boilerplate
// Basic JS World https://www.youtube.com/watch?v=PPwR7h5SnOE
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.module.js';

const KEYS = {
    'a': 65,
    's': 83,
    'w': 87,
    'd': 68,
  };

function clamp(x, a, b) {
    return Math.min(Math.max(x, a), b);
}
class InputController {
    constructor(target) {
        this._target = target || document;
        this._initialize();
    }

    _initialize() {
        this._current = {
            leftButton: false,
            rightButton: false,
            mouseXDelta: 0,
            mouseYDelta: 0,
            mouseX: 0,
            mouseY: 0,
        };
        this._previous = null;
        this._keys = {};
        this._previousKeys = {};
        this._target.addEventListener('mousedown', (e) => this._onMouseDown(e), false);
        this._target.addEventListener('click', (e) => this._onMouseDown(e), false);
        this._target.addEventListener('mousemove', (e) => this._onMouseMove(e), false);
        this._target.addEventListener('mouseup', (e) => this._onMouseUp(e), false);
        this._target.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        this._target.addEventListener('keyup', (e) => this._onKeyUp(e), false);
    }

    _onMouseMove(e) {
        
        if (this._previous === null) {
            this._previous = {...this._current};
        }

        this._current.mouseXDelta = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        this._current.mouseYDelta = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

    }

    _onMouseDown(e) {
        this._onMouseMove(e);
        switch(e.button) {
            case 0:
                this._current.leftButton = true;
                break;
            case 2:
                this._current.rightButton = true;
                break;
        }
    }

    _onMouseUp(e) {
        this._onMouseMove(e);
        switch(e.button) {
            case 0:
                this._current.leftButton = false;
                break;
            case 2:
                this._current.rightButton = false;
                break;
        }
    }

    _onKeyDown(e) {
        this._keys[e.keyCode] = true;
    }

    _onKeyUp(e) {
        this._keys[e.keyCode] = false;
    }

    key(keyCode) {
        return !!this._keys[keyCode];
    }

    isReady() {
        return this._previous !== null;
    }

    update(_) {
        if (this.isReady()) {
            this._current.mouseXDelta = this._current.mouseX - this._previous.mouseX;
            this._current.mouseYDelta = this._current.mouseY - this._previous.mouseY;
            
            this._previous = {...this._current};
        }
    }
}

class FirstPersonCamera {
    constructor(camera, objects) {
        this._camera = camera;
        this._input = new InputController();
        this._rotation = new THREE.Quaternion();
        this._translation = new THREE.Vector3(0, 2, 0);
        this._phi = 0;
        this._phiSpeed = 6;
        this._theta = 0;
        this._thetaSpeed = 3;
        this._headBobActive = false;
        this._headBobTimer = 0;
        this._objects = objects;
    }

    inputController() {
        return this._input;
    }

    update(timeElapsedS) {
        this._updateRotation(timeElapsedS);
        this._updateCamera(timeElapsedS);
        this._updateTranslation(timeElapsedS);
        this._updateHeadBob(timeElapsedS);
        this._input.update(timeElapsedS);
    }

    _updateCamera(_) {
        this._camera.quaternion.copy(this._rotation);
        this._camera.position.copy(this._translation);
        this._camera.position.y += Math.sin(this._headBobTimer * 10) / 4;

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this._rotation);

        const dir = forward.clone();

        forward.multiplyScalar(100);
        forward.add(this._translation);

        let closest = forward;
        const result = new THREE.Vector3();
        const ray = new THREE.Ray(this._translation, dir);
        for (let i=0; i < this._objects.length; i++) {
            if (ray.intersectBox(this._objects[i], result)) {
                if (result.distanceTo(ray.origin) < closest.distanceTo(ray.origin)) {
                    closest = result.clone();
                }
            }
        }

        this._camera.lookAt(closest);
    }

    _updateHeadBob(timeElapsedS) {
        if (this._headBobActive) {
            const wavelength = Math.PI;
            const nextStep = 1 + Math.floor(((this._headBobTimer + 0.000001) * 10) / wavelength);
            const nextStepTime = nextStep * wavelength / 10;
            this._headBobTimer = Math.min(this._headBobTimer + timeElapsedS, nextStepTime);
            
            if (this._headBobTimer == nextStepTime) {
                this._headBobActive = false;
            }
        }
    }

    _updateTranslation(timeElapsedS) {
        const forwardVelocity = (this._input.key(KEYS.w) ? 1 : 0) + (this._input.key(KEYS.s) ? -1 : 0);
        const strafeVelocity = (this._input.key(KEYS.a) ? 1 : 0) + (this._input.key(KEYS.d) ? -1 : 0);
    
        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._phi);

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(qx);
        forward.multiplyScalar(forwardVelocity * timeElapsedS * 10);

        const left = new THREE.Vector3(-1, 0, 0);
        left.applyQuaternion(qx);
        left.multiplyScalar(strafeVelocity * timeElapsedS * 10);

        this._translation.add(forward);
        this._translation.add(left);

        if (forwardVelocity != 0 || strafeVelocity != 0) {
            this._headBobActive = true;
        }
    }

    _updateRotation(timeElapsedS) {
        const xh = this._input._current.mouseXDelta / window.innerWidth;
        const yh = this._input._current.mouseYDelta / window.innerHeight;

        this._phi += -xh * this._phiSpeed;
        this._theta = clamp(this._theta + -yh * this._thetaSpeed, -Math.PI / 3, Math.PI / 3);

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._phi);
        const qz = new THREE.Quaternion();
        qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this._theta);

        const q = new THREE.Quaternion();
        q.multiply(qx);
        q.multiply(qz);

        this._rotation.copy(q);
    }
}

class PhysicsObject3D {
    constructor(physicsWorld, scene, rigidBodies) {
        this._physicsWorld = physicsWorld;
        this._scene = scene;
        this._rigidBodies = rigidBodies
    }

    createBox(mass, pos, size, color) {
        // ThreeJS section
        this._objThree = new THREE.Mesh(
            new THREE.BoxGeometry(size[0], size[1], size[2]),
            new THREE.MeshPhongMaterial({color})
        );
        
        this._objThree.position.set(pos[0], pos[1], pos[2]);
        this._objThree.castShadow = true;
        this._objThree.receiveShadow = true;
        this._scene.add(this._objThree);

        // Ammo.js section
        this._objAmmo = new RigidBody();
        this._objAmmo.createBox(mass, new THREE.Vector3(pos[0], pos[1], pos[2]), new THREE.Quaternion(), new THREE.Vector3(size[0], size[1], size[2]));
        this._physicsWorld.addRigidBody(this._objAmmo._body);
    }

    createBall(mass, pos, radius, color) {
        this._objThree = new THREE.Mesh(
            new THREE.SphereBufferGeometry(radius),
            new THREE.MeshPhongMaterial({color})
        );

        this._objThree.position.set(pos[0], pos[1], pos[2]);
        this._objThree.castShadow = true;
        this._objThree.receiveShadow = true;
        this._scene.add(this._objThree);

        // Ammo.js section
        this._objAmmo = new RigidBody();
        this._objAmmo.createBall(mass, new THREE.Vector3(pos[0], pos[1], pos[2]), new THREE.Quaternion(), radius);
        this._physicsWorld.addRigidBody(this._objAmmo._body);
    }

    addToRigidBodies() {
        this._rigidBodies.push(this);
    }
}

class RigidBody {
    constructor() {
    }

    createBox(mass, pos, quat, size) {
        this._transform = new Ammo.btTransform();
        this._transform.setIdentity();
        this._transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        this._transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        this._motionState = new Ammo.btDefaultMotionState(this._transform);

        const btSize = new Ammo.btVector3(size.x * 0.5, size.y * 0.5, size.z * 0.5);
        this._shape = new Ammo.btBoxShape(btSize);
        this._shape.setMargin(0.05);

        this._inertia = new Ammo.btVector3(0, 0, 0);
        if (mass > 0) {
            this._shape.calculateLocalInertia(mass, this._inertia);
        }

        this._info = new Ammo.btRigidBodyConstructionInfo(
            mass, this._motionState, this._shape, this._inertia
        );
        this._body = new Ammo.btRigidBody(this._info);
        // Ammo.destroy(btSize);
    }

    createBall(mass, pos, quat, radius) {
        this._transform = new Ammo.btTransform();
        this._transform.setIdentity();
        this._transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        this._transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        this._motionState = new Ammo.btDefaultMotionState(this._transform);

        this._shape = new Ammo.btSphereShape(radius);
        this._shape.setMargin(0.05);

        this._inertia = new Ammo.btVector3(0, 0, 0);
        this._shape.calculateLocalInertia(mass, this._inertia);

        this._info = new Ammo.btRigidBodyConstructionInfo(
            mass, this._motionState, this._shape, this._inertia
        );
        this._body = new Ammo.btRigidBody(this._info);
    }
}

class BasicWorldDemo {
    constructor() {
    }

    _Initialize() {
        // Ammo.JS config
        this._collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        this._dispatcher = new Ammo.btCollisionDispatcher(this._collisionConfiguration);
        this._broadphase = new Ammo.btDbvtBroadphase();
        this._solver = new Ammo.btSequentialImpulseConstraintSolver();
        this._physicsWorld = new Ammo.btDiscreteDynamicsWorld(
            this._dispatcher, this._broadphase, this._solver, this._collisionConfiguration
            );
            
            this._physicsWorld.setGravity(new Ammo.btVector3(0, -20, 0));
            
            // ThreeJS init with the canvas from HTML
            this._canvas = document.querySelector('canvas.webgl');
            this._threejs = new THREE.WebGLRenderer({
                canvas: this._canvas
            });
            this._threejs.shadowMap.enabled = true;
            this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
            this._threejs.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this._threejs.setSize(window.innerWidth, window.innerHeight);
            
        document.body.appendChild(this._threejs.domElement);
        
        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);
        
        window.addEventListener('click', () => {
            this._threejs.domElement.requestPointerLock();
        }, false);
        
        // Camera setup
        const fov = 70;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(20, 80, 50);
        this._camera.lookAt(new THREE.Vector3(0, 0, 0));
        
        // FPS Camera
        this._objects = [];
        this._fpsCamera = new FirstPersonCamera(this._camera, this._objects);

        // Input
        this._input = this._fpsCamera.inputController();
        
        // Scene
        this._scene = new THREE.Scene();

        // Light setup
        let light = new THREE.DirectionalLight(0xFFFFFF);
        light.position.set(100, 100, 100);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.01;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 1.0;
        light.shadow.camera.far = 500;
        light.shadow.camera.left = 200;
        light.shadow.camera.right = -200;
        light.shadow.camera.top = 200;
        light.shadow.camera.bottom = -200;

        this._scene.add(light);
        light = new THREE.AmbientLight(0x404040);
        this._scene.add(light);
        

        // Skybox
        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            './resources/skyboxes/water/humble_ft.jpg',
            './resources/skyboxes/water/humble_bk.jpg',
            './resources/skyboxes/water/humble_up.jpg',
            './resources/skyboxes/water/humble_dn.jpg',
            './resources/skyboxes/water/humble_rt.jpg',
            './resources/skyboxes/water/humble_lf.jpg',
        ]);

        this._scene.background = texture;
        this._rigidBodies = []

        // Ground Plane
        const newGround = new PhysicsObject3D(this._physicsWorld, this._scene, this._rigidBodies);
        newGround.createBox(0, [0, 0, 0], [50, 1, 50], 0xf4f4f4);
        newGround.addToRigidBodies();
        const ball1 = new PhysicsObject3D(this._physicsWorld, this._scene, this._rigidBodies);
        ball1.createBall(20, [1, 3, 0], 2, 0xff0000);
        ball1.addToRigidBodies();
        
        const box1 = new PhysicsObject3D(this._physicsWorld, this._scene, this._rigidBodies);
        box1.createBox(50, [0, 60, 0], [3, 3, 3], 0xfb8500);
        box1.addToRigidBodies();

        console.log(this._rigidBodies[1]._objAmmo._body.getLinearVelocity().y())

        this._tmpTransform = new Ammo.btTransform();
        this._previousRAF = null;
        
        // const axesHelper = new THREE.AxesHelper( 100 );
        // this._scene.add( axesHelper );
        this._RAF();
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF() {
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }

            // Step the simulation on a new frame
            this._Step(t - this._previousRAF);

            // Render the new frame, then trigger next frame update
            this._threejs.render(this._scene, this._camera);
            this._RAF();
            this._test(t - this._previousRAF);
            this._previousRAF = t;
        });
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;

        // this._fpsCamera.update(timeElapsedS);

        this._physicsWorld.stepSimulation(timeElapsedS, 10);

        for (let i = 0; i < this._rigidBodies.length; i++) {
            let objThree = this._rigidBodies[i]._objThree;
            let objAmmo = this._rigidBodies[i]._objAmmo;
            objAmmo._motionState.getWorldTransform(this._tmpTransform);
            const pos = this._tmpTransform.getOrigin();
            const quat = this._tmpTransform.getRotation();
            const pos3 = new THREE.Vector3(pos.x(), pos.y(), pos.z());
            const quat3 = new THREE.Quaternion(quat.x(), quat.y(), quat.z(), quat.w());

            objThree.position.copy(pos3);
            objThree.quaternion.copy(quat3);
        }
    }

    _test(timeElapsedS) {

        let scalingFactor = 20;

        const strafeVelocity = (this._input.key(KEYS.w) ? 1 : 0) + (this._input.key(KEYS.s) ? -1 : 0);
        const forwardVelocity = (this._input.key(KEYS.a) ? 1 : 0) + (this._input.key(KEYS.d) ? -1 : 0);
        // this._rigidBodies[1]._objAmmo._body.getLinearVelocity().y();

        let impulse = new Ammo.btVector3(-forwardVelocity, -0.5, -strafeVelocity);
        impulse.op_mul(scalingFactor);
        this._rigidBodies[1]._objAmmo._body.setLinearVelocity(impulse);
        console.log(this._rigidBodies[1]._objAmmo._body.getLinearVelocity().y())
        
    }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    Ammo().then((lib) => {
        Ammo = lib;
        _APP = new BasicWorldDemo();
        _APP._Initialize();
    })
})