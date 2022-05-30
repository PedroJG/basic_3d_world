// Imported like this here but could be done via webpack in larger projects. Just being used as a boilerplate
// Basic JS World https://www.youtube.com/watch?v=PPwR7h5SnOE
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.module.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';


class RigidBody {
    constructor() {
    }

    CreateBox(mass, pos, quat, size) {
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

        Ammo.destroy(btSize);
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

        this._physicsWorld.setGravity(new Ammo.btVector3(0, -100, 0));

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

        // Camera setup
        const fov = 60;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(75, 20, 0);

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

        // Controls setup
        const controls = new OrbitControls(this._camera, this._threejs.domElement);
        controls.target.set(0, 20, 0);
        controls.update();

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

        // Ground Plane
        const ground = new THREE.Mesh(
            new THREE.BoxGeometry(100, 1, 100),
            new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
            })
        );

        ground.castShadow = false;
        ground.receiveShadow = true;
        // ground.rotation.x = -Math.PI / 2;
        this._scene.add(ground);

        const rbGround = new RigidBody();
        rbGround.CreateBox(0, ground.position, ground.quaternion, new THREE.Vector3(100, 1, 100));
        this._physicsWorld.addRigidBody(rbGround._body);

        // Box
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(4, 4, 4),
            new THREE.MeshStandardMaterial({
                color: 0xfb8500,
            })
        );
        box.position.set(0, 60, 0);
        box.castShadow = true;
        box.receiveShadow = true;
        this._scene.add(box);

        const rbBox = new RigidBody();
        rbBox.CreateBox(1, box.position, box.quaternion, new THREE.Vector3(4, 4, 4));
        this._physicsWorld.addRigidBody(rbBox._body);

        this._rigidBodies = [{mesh: box, rigidBody: rbBox}]

        this._tmpTransform = new Ammo.btTransform();

        this._countdown = 1.0;
        this._count = 0;
        this._previousRAF = null;

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

            this._Step(t - this._previousRAF);
            this._threejs.render(this._scene, this._camera);
            this._RAF();
            this._previousRAF = t;
        });
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;

        this._physicsWorld.stepSimulation(timeElapsedS, 10);

        for (let i = 0; i < this._rigidBodies.length; i++) {
            this._rigidBodies[i].rigidBody._motionState.getWorldTransform(this._tmpTransform);
            const pos = this._tmpTransform.getOrigin();
            const quat = this._tmpTransform.getRotation();
            const pos3 = new THREE.Vector3(pos.x(), pos.y(), pos.z());
            const quat3 = new THREE.Quaternion(quat.x(), quat.y(), quat.z(), quat.w());

            this._rigidBodies[i].mesh.position.copy(pos3);
            this._rigidBodies[i].mesh.quaternion.copy(quat3);
        }
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