"use strict";

require.config({
  paths: {
    "order": "./lib/requirejs/order",
    "ammo": "./lib/ammo/ammo",
    "three": "./lib/three/three",
    "detector": "./lib/three/detector",
    "stats": "./lib/three/stats"
  }
});

define([
    "ammo",
    "three",
    "detector",
    "stats",
  ],
  function(Ammo, Three, Detector, Stats) {
    var 
      container,
      stats, 
      camera,
      scene,
      renderer,
      dynamicsWorld,
      lastTime = Date.now(),
      transform = new Ammo.btTransform(),
      relativeForce = new Ammo.btVector3(2000, 0 , 1000);
    
    var player = {
       width: 20,
       height: 40,
       depth: 20,
       x: 0,
       y: 440,
       z: 0
    };
    
    var ground = {
       width: 300,
       height: 300,
       depth: 300,
        x: 0,
        y: 0,
        z: 0
    };
    
    var initAmmo = function() {
      var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
      var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
      var overlappingPairCache = new Ammo.btDbvtBroadphase();
      var solver = new Ammo.btSequentialImpulseConstraintSolver();
      dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
      dynamicsWorld.setGravity(new Ammo.btVector3(0, 0, 0));
    };
    
    var initThree = function() {
      container = document.createElement("div");
      document.body.appendChild(container);

      scene = new Three.Scene();
      
      renderer =  new Three.WebGLRenderer({antialias: true});
      renderer.setSize( window.innerWidth, window.innerHeight );
      container.appendChild(renderer.domElement);
      
      stats = new Stats();
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.top = '0px';
      container.appendChild(stats.domElement);
      
      camera = new Three.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1, 
        20000
      );
      
      camera.position.y = 400;
      scene.add( camera );
      
      var sky = new Three.Mesh(
        new Three.SphereGeometry(10000, 60, 60), 
        new Three.MeshBasicMaterial({
          map: Three.ImageUtils.loadTexture('assets/textures/sky.jpg')
        })
      );
      sky.scale.x = -1;
      scene.add(sky);

      var light = new Three.DirectionalLight(0x0f0f0f);
      light.position.set(250, 400, 500);
      scene.add(light);
      
      scene.add(new Three.AmbientLight(0x404040)); 
    };
      
    var init = function() {
      initAmmo();
      initThree();
      
      //Ground setup
      ground.body = (function() {
        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(
          new Ammo.btVector3(ground.x, ground.y, ground.z)
        );
        var body = new Ammo.btRigidBody(
          new Ammo.btRigidBodyConstructionInfo(
            0, 
            new Ammo.btDefaultMotionState(transform), 
            new Ammo.btBoxShape(
              new Ammo.btVector3(ground.width / 2, ground.height / 2, ground.depth / 2)
            ), 
            new Ammo.btVector3(0, 0, 0)
          )
        );
        dynamicsWorld.addRigidBody(body);
        
        return body;
      })();
      
      ground.view = (function() {
        var view = Three.SceneUtils.createMultiMaterialObject(
          new Three.CubeGeometry(ground.width, ground.height, ground.depth, 4, 4, 4 ),
          [
            new Three.MeshLambertMaterial( 
              {ambient: 0xff1f1f, color: 0xffffff} 
            ),
            new Three.MeshBasicMaterial(
              {color: 0xffffff, wireframe: false, transparent: true, opacity: 0.1 }
            )
          ]
        );
        view.position.set(ground.x, ground.y, ground.z);
        scene.add(view);
        
        return view;
      })();
      
      //Player setup
      player.body = (function() {
        var shape = new Ammo.btBoxShape(
          new Ammo.btVector3(player.width / 2, player.height / 2, player.depth / 2)
        );
      
        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(
          new Ammo.btVector3(player.x, player.y, player.z)
        );
      
        var mass = 1;
        var localInertia = new Ammo.btVector3(0, 0, 0);
        shape.calculateLocalInertia(mass, localInertia);
      
        var body = new Ammo.btRigidBody(
          new Ammo.btRigidBodyConstructionInfo(
            mass,
            new Ammo.btDefaultMotionState(transform),
            shape,
            localInertia
          )
        );
        dynamicsWorld.addRigidBody(body);
        
        body.getWorldTransform(transform);

        var boxRot = transform.getBasis();
        var correctedForce = boxRot.op_mul(relativeForce);
        body.applyCentralForce(correctedForce);
        
        return body;
      })();
      
      player.view = (function() {
        var view = Three.SceneUtils.createMultiMaterialObject(
          new Three.CubeGeometry(player.width, player.height, player.depth, 4, 4, 4),
          [
            new Three.MeshLambertMaterial(
              {ambient: 0x000000, color: 0xffffff }
            ),
            new Three.MeshBasicMaterial(
              {color: 0xffffff, wireframe: false, transparent: true, opacity: 0.1} 
            )
          ]
        );
        view.useQuaternion = true;
        scene.add(view);
        
        return view;
      })();
    };

    var render = function() {
      var timer = Date.now() * 0.0001;

      camera.position.x = Math.cos( timer ) * 800;
      camera.position.z = Math.sin( timer ) * 800;

      camera.lookAt(player.view.position);

      renderer.render(scene, camera);
    };
    
    function simulate() {
      var now = Date.now();
      var dt = (now - lastTime) * 0.01;
      lastTime = now;
      
      requestAnimationFrame(simulate);
      dynamicsWorld.stepSimulation(dt, 2);
      
      player.body.getMotionState().getWorldTransform(transform);
      var origin = transform.getOrigin();
      
      player.view.position.x = origin.x();
      player.view.position.y = origin.y();
      player.view.position.z = origin.z();
      
      player.body.applyCentralForce(origin.op_mul(-1).normalize().op_mul(10));
      
      var rotation = transform.getRotation();
      player.view.quaternion.x = rotation.x();
      player.view.quaternion.y = rotation.y();
      player.view.quaternion.z = rotation.z();
      player.view.quaternion.w = rotation.w();
      
      render();
      stats.update();
    };
    
    document.body.onclick = function(event) {
      player.body.getWorldTransform(transform);
      
      var boxRot = transform.getBasis();
      var correctedForce = boxRot.op_mul(relativeForce);
      player.body.applyCentralForce(correctedForce);
      
      // player.body.getWorldTransform(transform);
      //       var origin = transform.getOrigin();
      //       origin.setX(0);
      //       origin.setY(220);
      //       origin.setZ(0);
      //       
      //       var quaternion = new Ammo.btQuaternion();
      //       quaternion.setEuler(0, 0.1, 0);
      //       transform.setRotation(quaternion);
      //       
      //       player.body.setCenterOfMassTransform(transform);
      player.body.activate();
    };
    
    init();
    simulate();
  }
);