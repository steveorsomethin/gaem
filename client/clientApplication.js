require.config({
  paths: {
    "order": "./lib/requirejs/order",
    "ammo": "./lib/ammo/ammo",
    "three": "./lib/three/three"
  }
});

define([
    "ammo",
    "three"
  ],
  function(ammo, three) {
    var container;
    var camera, scene, renderer;

    init();
    animate();

    function init() {

      container = document.createElement( 'div' );
      document.body.appendChild( container );

      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
      camera.position.y = 400;
      scene.add( camera );

      var light, object, materials;

      scene.add( new THREE.AmbientLight( 0x404040 ) );

      light = new THREE.DirectionalLight( 0xffffff );
      light.position.set( 0, 0, 1 );
      scene.add( light );

      materials = [
        new THREE.MeshLambertMaterial( { ambient: 0xbbbbbb, map: THREE.ImageUtils.loadTexture( 'textures/ash_uvgrid01.jpg' ) } ),
        new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: true, transparent: true, opacity: 0.1 } )
      ];

      object = THREE.SceneUtils.createMultiMaterialObject( new THREE.CubeGeometry( 100, 100, 100, 4, 4, 4 ), materials );
      object.position.set(0, 0, 0);
      scene.add(object);

      var points = [];

      for ( var i = 0; i < 50; i ++ ) {

        points.push( new THREE.Vector3( Math.sin( i * 0.2 ) * 15 + 50, 0, ( i - 5 ) * 2 ) );

      }

      renderer = new THREE.WebGLRenderer( { antialias: true } );
      renderer.setSize( window.innerWidth, window.innerHeight );

      container.appendChild( renderer.domElement );
    }

    //

    function animate() {

      requestAnimationFrame(animate);

      render();
    }

    function render() {

      var timer = Date.now() * 0.0001;

      camera.position.x = Math.cos( timer ) * 800;
      camera.position.z = Math.sin( timer ) * 800;

      camera.lookAt( scene.position );

      for ( var i = 0, l = scene.children.length; i < l; i ++ ) {

        var object = scene.children[ i ];

        object.rotation.x += 0.01;
        object.rotation.y += 0.005;

      }

      renderer.render( scene, camera );

    }
  }
);