// Imported like this here but could be done via webpack in larger projects. Just being used as a boilerplate
// Basic JS World https://www.youtube.com/watch?v=PPwR7h5SnOE
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.module.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

class BasicWorldDemo {
    constructor() {
        this._Initialize();
    }

    _Initialize() {
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
            console.log("window resized");
        }, false);

        // Camera setup
        const fov = 60;
        const aspect = 1920 / 1080;
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

        // Plane
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100, 10, 10),
            new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
            })
        );

        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._scene.add(plane);

        const box = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({
                color: 0x808080,
            })
        );
        box.position.set(0, 2, 0);
        box.castShadow = true;
        box.receiveShadow = true;
        this._scene.add(box);



        this._RAF();
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF() {
        requestAnimationFrame(() => {
            this._threejs.render(this._scene, this._camera);
            this._RAF();
        });
    }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    _APP = new BasicWorldDemo();
})