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
      relativeForce = new Ammo.btVector3(2000, 0 , 0);
    
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
    
    var keys = {
      w: false,
      a: false,
      s: false,
      d: false
    };
    
    var pointAt = function(body, targetVector) {
      body.getMotionState().getWorldTransform(transform);
      var bodyMatrix = transform.getBasis();
      var bodyOrigin = transform.getOrigin();
      var originCopy = new Ammo.btVector3(bodyOrigin.x(), bodyOrigin.y(), bodyOrigin.z());
      originCopy.op_mul(-1).normalize();
      
      var xAxis = bodyMatrix.getRow(0);
      var yAxis = bodyMatrix.getRow(1);
      var zAxis = bodyMatrix.getRow(2);
      
      var matrix = new Three.Matrix4(
        xAxis.x(), xAxis.y(), xAxis.z(), 0,
        yAxis.x(), yAxis.y(), yAxis.z(), 0,
        zAxis.x(), zAxis.y(), zAxis.z(), 0
      );
      
      matrix.lookAt(
        new Three.Vector3(bodyOrigin.x(), bodyOrigin.y(), bodyOrigin.z()),
        new Three.Vector3(targetVector.x(), targetVector.y(), targetVector.z()),
        new Three.Vector3(originCopy.x(), originCopy.y(), originCopy.z())
      );
      
      var matrix90 = new Three.Matrix4();
      matrix90.setRotationX(90 * 3.14 / 180);
      
      matrix.multiplySelf(matrix90);
      
      bodyMatrix.setValue(
        matrix.n11, matrix.n12, matrix.n13,
        matrix.n21, matrix.n22, matrix.n23,
        matrix.n31, matrix.n32, matrix.n33
      );
      
      return transform;
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
             // new Ammo.btSphereShape(
             //    new Ammo.btVector3(ground.width / 2)
             //  ),
            new Ammo.btVector3(0, 0, 0)
          )
        );
        dynamicsWorld.addRigidBody(body);
        
        return body;
      })();
      
      ground.view = (function() {
        var view = Three.SceneUtils.createMultiMaterialObject(
          new Three.CubeGeometry(ground.width, ground.height, ground.depth, 4, 4, 4 ),
          //new Three.SphereGeometry(ground.width / 2, 20, 20 ),
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
      
      if(keys.w) {
        var boxRot = transform.getBasis();
        var correctedForce = boxRot.op_mul(relativeForce);
        player.body.applyCentralForce(correctedForce);
        player.body.activate();
      }
      
      var origin = transform.getOrigin();
            
      player.view.position.x = origin.x();
      player.view.position.y = origin.y();
      player.view.position.z = origin.z();
      
      var originCopy = new Ammo.btVector3(origin.x(), origin.y(), origin.z());
      player.body.applyCentralForce(originCopy.op_mul(-1).normalize().op_mul(100));
      player.body.setCenterOfMassTransform(pointAt(player.body, new Ammo.btVector3(0, 0, 0)));
      
      var rotation = transform.getRotation();
      player.view.quaternion.x = rotation.x();
      player.view.quaternion.y = rotation.y();
      player.view.quaternion.z = rotation.z();
      player.view.quaternion.w = rotation.w();
      
      render();
      stats.update();
      
    };
    
    var handleKeyEvent = function(which, down) {
      switch(event.which) {
        case 87: //W
          keys.w = down;
          break;
        case 65: //A
          keys.a = down;
          break;
        case 83: //S
          keys.s = down;
          break;
        case 68: //D
          keys.d = down;
          break;
        default:
          break;
      }
    }
    
    document.body.onkeydown = function(event) {
      handleKeyEvent(event.which, true);
    };
    
    document.body.onkeyup = function(event) {
      handleKeyEvent(event.which, false);
    };
    
    document.body.onclick = function(event) {
      player.body.getMotionState().getWorldTransform(transform);
      
      // var boxRot = transform.getBasis();
      // var correctedForce = boxRot.op_mul(relativeForce);
      // player.body.applyCentralForce(correctedForce);

      // var origin = transform.getOrigin();
      //             
      //       var quaternion = new Ammo.btQuaternion();
      //       var originCopy = new Ammo.btVector3(origin.x(), origin.y(), origin.z());
      //       var normalizedOrigin = originCopy.op_mul(-1).normalize();
      //       
      //       quaternion.setEuler(
      //         normalizedOrigin.x(),
      //         normalizedOrigin.y(),
      //         normalizedOrigin.z()
      //       );
      //       transform.setRotation(quaternion);
      var boxRot = transform.getBasis();
      var correctedForce = boxRot.op_mul(relativeForce);
      player.body.applyCentralForce(correctedForce);
      
      player.body.setCenterOfMassTransform(pointAt(player.body, new Ammo.btVector3(0, 0, 0)));
      player.body.activate();
    };
    
    init();
    simulate();
  }
);