//http-server -c-1
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    disableWebGL2Support: false, // Assurer l'utilisation de WebGL 2.0 si disponible
});

const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

var camera = new BABYLON.UniversalCamera("MyCamera", new BABYLON.Vector3(0, 1, 0), scene);
camera.minZ = 0.0001;
camera.attachControl(canvas, true);
camera.speed = 0.9;
camera.angularSpeed = 0.05;
camera.angle = Math.PI / 2;
camera.direction = new BABYLON.Vector3(Math.cos(camera.angle), 0, Math.sin(camera.angle));

scene.onPointerObservable.add((pointerInfo) => {
  switch (pointerInfo.type) {
    case BABYLON.PointerEventTypes.POINTERPICK:
      searchButton.click();
      break;
	 }
});

//const cameraDirection = camera.getForwardRay().direction.normalize();
//const fov = camera.fov; // Champs de vision de la caméra
//const cameraPosition = camera.position;
//const cameraGetTarget = camera.getTarget();

const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
light.intensity = 1;

let time = 0;
let blinkCount = 0;

// Initialise le compteur et le seuil
let frameCounter = 0;
const frameThreshold = 20; // Ajustez ce nombre pour changer la fréquence

// Variables pour le mode démo
let demoModeActive = false;
let demoInterval = null;
let currentDemoGroupIndex = 0;
let demoGroups = [];
const demoPauseDuration = 3000; // 3 secondes de pause à chaque groupe

//var font = "Calibri 20px monospace";

const scatter = new BABYLON.PointsCloudSystem("scatter", 0, scene);

const labelSprites = [];
const originalPositions = [];

// Create scatter mesh and label sprites
//const imageUrl = 'bubble12.png';
//const imageSize = 5000;

const imageUrl = 'etoile2.png';
const imageSize = 640;
const spriteRatio = 1;


function main(currentData, ratio) {


const data = currentData.map(d => {
    d.x = d.x * ratio;
    d.y = d.y * ratio;
    d.z = d.z * ratio;
    d.color = getColor(d.subType);
    d.metadata = { subType: d.subType };
    return d;
});


const labelSpriteManager = new BABYLON.SpriteManager('labelSpriteManager', imageUrl, data.length, imageSize, scene);
labelSpriteManager.isPickable = true;



scatter.addPoints(data.length, function(particle) {
    const point = data[particle.idx];
    particle.position = new BABYLON.Vector3(point.x, point.y, point.z);
    originalPositions.push(particle.position.clone());
	
    let sprite = new BABYLON.Sprite(point.prefLabel, labelSpriteManager);
	sprite.isPickable = true;
    sprite.position = particle.position;
	sprite.originalPosition = originalPositions[particle.idx];
    sprite.size = spriteRatio;
    sprite.color = new BABYLON.Color4(point.color.r, point.color.g, point.color.b, 1);
	sprite.metadata = { subType: point.subType };
    sprite.isVisible = true; // Ensure the sprite is initially visible

// Add an ActionManager to the sphere
sprite.actionManager = new BABYLON.ActionManager(scene);

// Register actions for mouse over and mouse out
sprite.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnPointerOverTrigger,
    function (evt) {
		const spriteName = evt.source.name;
		const sprites = scene.spriteManagers[0].sprites; // Assuming the first sprite manager
		
		let targetSprite = sprites.find(s => s.name === spriteName);

        // Find the nearest particles
        let distances = sprites.filter(s => s.isVisible).map(sprite => {
            return {
                name: sprite.name,
                distance: BABYLON.Vector3.Distance(targetSprite.originalPosition, sprite.originalPosition)
            };
        });
        distances.sort((a, b) => a.distance - b.distance);
		
		updateNearestList(distances, spriteName, targetSprite.metadata.subType)
		
		searchInput.value = spriteName
    }
));


sprite.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickUpTrigger, function (evt) {
		searchInput.value = evt.source.name
		moveCameraToSprite(evt.source.name);
	}));

    labelSprites.push(sprite);
});

	
scene.onBeforeRenderObservable.add(() => {
	
	updateSpritePositions();
	
	frameCounter++;
    if (frameCounter > frameThreshold) {
        frameCounter = 0;  // Réinitialise le compteur
		
    var names = [];
	
		const cameraDirection = camera.getForwardRay().direction.normalize();
		const fov = camera.fov; // Champs de vision de la caméra
		const cameraPosition = camera.position;
	
    scene.spriteManagers[0].sprites.map(s => {
        var width = engine.getRenderWidth();
        var height = engine.getRenderHeight();
        var identityMatrix = BABYLON.Matrix.Identity();
        var getTransformMatrix = scene.getTransformMatrix();
        var toGlobal = camera.viewport.toGlobal(width, height);
        const projectedPosition = BABYLON.Vector3.Project(
            s.position,
            identityMatrix,
            getTransformMatrix,
            toGlobal
        );
		
		const spriteDirection = s.position.subtract(cameraPosition).normalize();
		const angle = Math.acos(BABYLON.Vector3.Dot(cameraDirection, spriteDirection));
		
        const distance = BABYLON.Vector3.Distance(camera.position, s.position);
		
        if (distance > 2 && distance < 12 && angle < fov && s.isVisible) {
            names.push({
                "name": s.name + '_layer',
                "meshName": s.name + '_mesh',
                "matName": s.name + '_mat',
                "textureName": s.name,
				"color": s.color,
                "position": s.position
            });
        }
    });

    // Dispose of unused meshes
    scene.meshes.filter(mesh => mesh.name !== 'BACKGROUND').forEach(mesh => {
        if (!names.some(n => n.meshName === mesh.name)) {
            if (mesh.material) {
                if (mesh.material.emissiveTexture) {
                    mesh.material.emissiveTexture.dispose(); // Dispose the emissive texture
                }
                mesh.material.dispose(); // Dispose the material
            }
            scene.removeMesh(mesh);
            mesh.dispose(); // Dispose the mesh
        }
    });

    // Dispose of unused materials
    scene.materials.filter(material => material.name !== 'BACKGROUND').forEach(material => {
        if (!names.some(n => n.matName === material.name)) {
            if (material.emissiveTexture) {
                material.emissiveTexture.dispose(); // Dispose the emissive texture
            }
            scene.removeMaterial(material);
            material.dispose(); // Dispose the material
        }
    });

    names.forEach(n => {
        if (!scene.meshes.some(l => l.name === n.meshName)) {
            const font_size = 12
            const planeTexture = new BABYLON.DynamicTexture("dynamic texture", font_size*100, scene, true, BABYLON.DynamicTexture.TRILINEAR_SAMPLINGMODE);
			
			var textureContext = planeTexture.getContext();
			
			//Draw on canvas
			textureContext.lineWidth = 2;
			textureContext.beginPath();
			textureContext.arc(font_size*50, font_size*50, 30, -Math.PI/5, Math.PI/5);
			textureContext.strokeStyle = "rgba("+255*n.color.r+", "+255*n.color.g+", "+255*n.color.b+", 0.7)";
			textureContext.stroke();
			
			textureContext.beginPath();
			textureContext.arc(font_size*50, font_size*50, 30, -Math.PI/5 + Math.PI, Math.PI/5 + Math.PI);
			textureContext.stroke();
			
			planeTexture.update();
			
			
            planeTexture.drawText(n.textureName, null, (font_size*53), "" + font_size + "px system-ui", "white", "transparent", true, true);
            var material = new BABYLON.StandardMaterial(n.textureName + '_mat', scene);
            material.emissiveTexture = planeTexture;
            material.opacityTexture = planeTexture;
            material.backFaceCulling = true;
            material.disableLighting = true;
            material.freeze();

			var outputplane = BABYLON.Mesh.CreatePlane(n.textureName + '_mesh', font_size, scene, false);
            outputplane.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL;
            outputplane.isVisible = true;
            outputplane.position = n.position;
            outputplane.material = material;
        }
    });
	}
});

scatter.buildMeshAsync().then(mesh => {
    mesh.material = new BABYLON.StandardMaterial('scatterMaterial', scene);
    mesh.material.pointSize = 10;
    mesh.material.usePointSizing = true;
    mesh.material.disableLighting = true;
    mesh.material.pointColor = new BABYLON.Color3(1, 1, 1);
});

engine.runRenderLoop(renderLoop);

// Resize the engine on window resize
    window.addEventListener('resize', function () {
        engine.resize();
    });


    createLegend(data);
	updateParticleList();
	
}	

const showPasswordModal = () => {
    return new Promise((resolve) => {
        const passwordModal = document.getElementById('passwordModal');
        const passwordInput = document.getElementById('passwordInput');
        const submitPasswordButton = document.getElementById('submitPasswordButton');

        passwordModal.style.display = 'block'; 
        passwordInput.value = ''; 
        passwordInput.focus(); 

        const submitHandler = () => {
            const password = passwordInput.value;
            passwordModal.style.display = 'none';
            submitPasswordButton.removeEventListener('click', submitHandler);
            resolve(password);
        };

        submitPasswordButton.addEventListener('click', submitHandler);
    });
};

const loadFileButton = document.getElementById('loadFileButton');

document.addEventListener("DOMContentLoaded", function() {

    //createLegend(data);
	//updateParticleList();

    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function(event) {
            event.preventDefault();
			 const spriteName = document.getElementById('searchInput').value;
            moveCameraToSprite(spriteName);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // This prevents any default form submitting
				const spriteName = document.getElementById('searchInput').value;
				searchInput.blur();
                moveCameraToSprite(spriteName);
            }
        });
		
		searchInput.addEventListener('focus', function(event) {
            searchInput.value = '';
        });

        searchInput.addEventListener('change', function(event) {
			const spriteName = document.getElementById('searchInput').value;
            moveCameraToSprite(spriteName);
        });
    }

    // Event listener pour le bouton mode démo
    const demoModeButton = document.getElementById('demoModeButton');
    if (demoModeButton) {
        demoModeButton.addEventListener('click', function() {
            toggleDemoMode();
        });
    }

});

loadFileButton.addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (file) {
        try {
            const reader = new FileReader();
            reader.onload = async function(event) {
                const newdata = JSON.parse(event.target.result);
                main(newdata, 20);
                document.getElementById('fileInputContainer').style.display = 'none';
            };
            reader.readAsText(file);
        } catch (error) {
            alert('An error occurred while parsing the file.');
            console.error(error);
        }
    } else {
        try {
			
			const response = await fetch('./encrypted_PSO_0.json');
            const encryptedData = await response.text();
            const password = await showPasswordModal();
            const data = decryptData(encryptedData, password);
			
            //const response = await fetch('./PSO_0.json');
            //const data = await response.json();
            main(data, 1);
            document.getElementById('fileInputContainer').style.display = 'none';
        } catch (error) {
            console.error("Failed to load JSON:", error);
        }
    }
});

function getColor(type) {
    const colors = {
        TECHNICAL: {
            r: 85 / 255,
            g: 113 / 255,
            b: 255 / 255
        },
        PROTOCOL: {
            r: 255 / 255,
            g: 121 / 255,
            b: 166 / 255
        },
        OPERATING_SYSTEM: {
            r: 215 / 255,
            g: 0 / 255,
            b: 248 / 255
        },
        BUSINESS_SOFTWARE: {
            r: 134 / 255,
            g: 0 / 255,
            b: 255 / 255
        },
        TOOL: {
            r: 121 / 255,
            g: 210 / 255,
            b: 255 / 255
        },
        FUNCTIONAL: {
            r: 164 / 255,
            g: 255 / 255,
            b: 182 / 255
        },
        PROGRAMMING_LANGUAGE: {
            r: 22 / 255,
            g: 233 / 255,
            b: 255 / 255
        },
        METHOD: {
            r: 204 / 255,
            g: 144 / 255,
            b: 255 / 255
        },
        DATABASE: {
            r: 11 / 255,
            g: 255 / 255,
            b: 227 / 255
        },
        BEHAVIORAL: {
            r: 255 / 255,
            g: 51 / 255,
            b: 51 / 255
        },
        FRAMEWORK: {
            r: 255 / 255,
            g: 230 / 255,
            b: 0 / 255
        },
        TRANSVERSAL: {
            r: 255 / 255,
            g: 131 / 255,
            b: 15 / 255
        },
        PLATFORM: {
            r: 213 / 255,
            g: 14 / 255,
            b: 98 / 255
        },
        NORMS_AND_STANDARDS: {
            r: 255 / 255,
            g: 152 / 255,
            b: 0 / 255
        },
        LANGUAGE: {
            r: 255 / 255,
            g: 193 / 255,
            b: 101 / 255
        },
        DEFAULT: {
            r: 96 / 255,
            g: 125 / 255,
            b: 139 / 255
        },
	cluster_1: {
    r: 0 / 255,
    g: 153 / 255,
    b: 204 / 255
},
cluster_2: {
    r: 255 / 255,
    g: 102 / 255,
    b: 102 / 255
},
cluster_3: {
    r: 102 / 255,
    g: 204 / 255,
    b: 0 / 255
},
cluster_4: {
    r: 255 / 255,
    g: 153 / 255,
    b: 51 / 255
},
cluster_5: {
    r: 204 / 255,
    g: 51 / 255,
    b: 255 / 255
},
cluster_6: {
    r: 102 / 255,
    g: 255 / 255,
    b: 178 / 255
},
cluster_7: {
    r: 255 / 255,
    g: 255 / 255,
    b: 102 / 255
},
cluster_8: {
    r: 255 / 255,
    g: 51 / 255,
    b: 153 / 255
},
cluster_9: {
    r: 153 / 255,
    g: 153 / 255,
    b: 255 / 255
},
cluster_10: {
    r: 255 / 255,
    g: 204 / 255,
    b: 0 / 255
},
cluster_11: {
    r: 0 / 255,
    g: 204 / 255,
    b: 102 / 255
},
cluster_12: {
    r: 204 / 255,
    g: 0 / 255,
    b: 204 / 255
},
cluster_13: {
    r: 255 / 255,
    g: 229 / 255,
    b: 204 / 255
},
cluster_14: {
    r: 255 / 255,
    g: 102 / 255,
    b: 192 / 255
},
cluster_15: {
    r: 204 / 255,
    g: 102 / 255,
    b: 51 / 255
},
cluster_16: {
    r: 51 / 255,
    g: 204 / 255,
    b: 255 / 255
},
cluster_17: {
    r: 153 / 255,
    g: 255 / 255,
    b: 204 / 255
},
cluster_18: {
    r: 255 / 255,
    g: 179 / 255,
    b: 102 / 255
},
cluster_19: {
    r: 204 / 255,
    g: 51 / 255,
    b: 51 / 255
},
cluster_20: {
    r: 0 / 255,
    g: 153 / 255,
    b: 153 / 255
},
cluster_21: {
    r: 204 / 255,
    g: 204 / 255,
    b: 0 / 255
},
cluster_22: {
    r: 255 / 255,
    g: 102 / 255,
    b: 255 / 255
},
cluster_23: {
    r: 153 / 255,
    g: 51 / 255,
    b: 255 / 255
},
cluster_24: {
    r: 102 / 255,
    g: 51 / 255,
    b: 0 / 255
},
cluster_25: {
    r: 51 / 255,
    g: 255 / 255,
    b: 102 / 255
},
cluster_26: {
    r: 255 / 255,
    g: 102 / 255,
    b: 0 / 255
},
cluster_27: {
    r: 153 / 255,
    g: 0 / 255,
    b: 51 / 255
},
cluster_28: {
    r: 102 / 255,
    g: 153 / 255,
    b: 153 / 255
},
cluster_29: {
    r: 0 / 255,
    g: 204 / 255,
    b: 255 / 255
},
cluster_30: {
    r: 255 / 255,
    g: 153 / 255,
    b: 204 / 255
}
    };

    return colors[type] || colors.DEFAULT;
}

// Update sprite positions to add small movements
function updateSpritePositions() {
    time += 0.004;
	
	const cameraDirection = camera.getForwardRay().direction.normalize();
	const fov = camera.fov; // Champs de vision de la caméra
	const cameraPosition = camera.position;
	const cameraGetTarget = camera.getTarget();

	labelSprites.forEach((sprite, idx) => {
		const distance = BABYLON.Vector3.Distance(cameraPosition, sprite.position);
		
		if (distance < 150) {
			const spriteDirection = sprite.position.subtract(cameraPosition).normalize();
			const angle = Math.acos(BABYLON.Vector3.Dot(cameraDirection, spriteDirection));
			if( angle < fov) {
				const originalPosition = originalPositions[idx];
				sprite.position.x = originalPosition.x + 0.8 * Math.sin(time + idx);
				sprite.position.y = originalPosition.y + 0.8 * Math.cos(time + idx);
				sprite.position.z = originalPosition.z + 0.8 * Math.sin(time + idx);
				sprite.angle = 0.01*idx;
			}
		}
    });
}

// Start rendering the scene on each animation frame
function renderLoop() {
    scene.render();
}

function blinkSprite(sprite) {
    let isDefaultColor = true; // État du sprite, vrai si la couleur par défaut est affichée
    const defaultColor = sprite.color
    const highlightColor = new BABYLON.Color4(1, 1, 1, 1);
	const mediumMediumlightColor = new BABYLON.Color4((sprite.color.r+1)/2, (sprite.color.g+1)/2, (sprite.color.b+1)/2, (sprite.color.a+1)/2);
	const mediumLowlightColor = new BABYLON.Color4((3*sprite.color.r+1)/4, (3*sprite.color.g+1)/4, (3*sprite.color.b+1)/4, (3*sprite.color.a+1)/4);
	const mediumHighlightColor = new BABYLON.Color4((sprite.color.r+3)/4, (sprite.color.g+3)/4, (sprite.color.b+3)/4, (sprite.color.a+3)/4);

    // Configure l'intervalle de clignotement
    setInterval(() => {
		blinkCount+=1
		
		var moduloBlink = blinkCount % 8;
		
        if (moduloBlink == 0) {
            sprite.color = defaultColor;
            isDefaultColor = true;
        } else if (moduloBlink == 1 || moduloBlink == 7) {
            sprite.color = mediumLowlightColor;
            isDefaultColor = false;
        } else if (moduloBlink == 2 || moduloBlink == 6) {
            sprite.color = mediumMediumlightColor;
            isDefaultColor = false;
        } else if (moduloBlink == 3 || moduloBlink == 5) {
            sprite.color = mediumHighlightColor;
            isDefaultColor = false;
        } else {
            sprite.color = highlightColor;
            isDefaultColor = false;
        }
    }, 200); // Durée du clignotement en millisecondes
}

function moveCameraToSprite(spriteName) {
	console.log('move to',spriteName);
    const sprites = scene.spriteManagers[0].sprites; // Assuming the first sprite manager
    let targetSprite = sprites.find(s => s.name === spriteName);

    if (targetSprite) {
        const targetPosition = new BABYLON.Vector3(targetSprite.position.x, targetSprite.position.y, targetSprite.position.z);
        const cameraStartPosition = camera.position.clone();
        const cameraStartTarget = camera.getTarget().clone();

        const bufferDistance = 9; // Adjust the distance from sprite
        const directionVector = targetPosition.subtract(camera.position).normalize();
        const adjustedTargetPosition = targetPosition.subtract(directionVector.scale(bufferDistance));


		const moveDistance = BABYLON.Vector3.Distance(cameraStartPosition, adjustedTargetPosition);
		const numberOfFrames = Math.min(300,Math.max(60,Math.round(moveDistance * 4)));
		
		// Create animation for camera position (encore plus ralenti avec 15 fps)
		      const animCamPosition = new BABYLON.Animation("animCamPosition", "position", 15, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
		      animCamPosition.setKeys([{frame: 0, value: cameraStartPosition},{frame: numberOfFrames, value: adjustedTargetPosition}]);

		      // Create animation for camera target (encore plus ralenti avec 15 fps)
		      const animCamTarget = new BABYLON.Animation("animCamTarget", "target", 15, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
		      animCamTarget.setKeys([{frame: 0, value: cameraStartTarget},{  frame: numberOfFrames, value: targetPosition}]);

        // Démarrer l'animation et attendre qu'elle se termine avant la pause
        const animationGroup = scene.beginDirectAnimation(camera, [animCamPosition, animCamTarget], 0, numberOfFrames, false);
        
        blinkSprite(targetSprite);
        
        // Retourner la promesse d'animation pour pouvoir attendre sa fin
        return new Promise((resolve) => {
            animationGroup.onAnimationEndObservable.addOnce(() => {
                resolve();
            });
        });

        // Find the nearest particles
        let distances = sprites.filter(s => s.isVisible).map(sprite => {
            return {
                name: sprite.name,
                distance: BABYLON.Vector3.Distance(targetSprite.originalPosition, sprite.originalPosition)
            };
        });
        distances.sort((a, b) => a.distance - b.distance);
		
		updateNearestList(distances, spriteName, targetSprite.metadata.subType)
		
    } else {
        console.log("Sprite not found: " + spriteName);
    }
}

function updateNearestList(distances, spriteName, subType) {
		// Get top 100 nearest particles
        let nearestParticles = distances.slice(1, 101);

        // Update the nearest list
		const nearestList = document.getElementById('nearestList');
			nearestList.innerHTML = '';
			let i=0
			
			
		let listItem = document.createElement('li');
			listItem.className = 'nearest-item first-item';
			listItem.textContent = `${spriteName} (${subType})`;
		
		nearestList.appendChild(listItem);
		
		nearestParticles.forEach(particle => {
			i=i+1;
			let listItem = document.createElement('li');
				listItem.className = 'nearest-item';
				listItem.textContent = `${i} : ${particle.name} (${particle.distance.toFixed(2)})`;

				// Ajouter un écouteur d'événements click à chaque élément de la liste
				listItem.addEventListener('click', function() {
					searchInput.value = particle.name;
					moveCameraToSprite(particle.name);
				});

			nearestList.appendChild(listItem);
		});
}

function createLegend(data) {
    const uniqueTypes = [...new Set(data.map(item => item.subType))];
    const legendContainer = document.getElementById('legend');
    legendContainer.innerHTML = '';

	//const totalLinesElement = document.createElement('div');
	//totalLinesElement.className = 'legend-total';
    //totalLinesElement.textContent = `Count: ${data.length}`;
    //legendContainer.appendChild(totalLinesElement);
	
	console.log('count:', data.length);
	
    uniqueTypes.sort().forEach(type => {
        const color = `rgb(${getColor(type).r * 255}, ${getColor(type).g * 255}, ${getColor(type).b * 255})`;
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.dataset.type = type;
        legendItem.dataset.active = 'true'; // By default, all items are active

        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = color;

        const label = document.createElement('span');
        label.textContent = type;

        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
        legendContainer.appendChild(legendItem);

        // Add event listener for click
        legendItem.addEventListener('click', function() {
            filterByType(type);
            toggleLegendItemColor(legendItem);
        });
    });
}

// Function to filter sprites by type
function filterByType(type) {
    scene.spriteManagers[0].sprites.forEach(sprite => {
		if (sprite.metadata && sprite.metadata.subType === type) {
            sprite.isVisible = !sprite.isVisible;
        }
    });
	
	updateParticleList();
}

// Function to toggle the legend item color
function toggleLegendItemColor(legendItem) {
    const isActive = legendItem.dataset.active === 'true';
    if (isActive) {
        legendItem.style.opacity = 0.5; // Make the color lighter
    } else {
        legendItem.style.opacity = 1.0; // Restore the original color
    }
    legendItem.dataset.active = (!isActive).toString();
}

// Function to update the datalist options based on particle visibility
function updateParticleList() {
	
    const dataList = document.getElementById('particlesList');
    dataList.innerHTML = ''; // Clear existing items

    const particleNames = scene.spriteManagers[0].sprites
        .filter(sprite => sprite.isVisible)
        .map(sprite => sprite.name);
    
    particleNames.forEach(name => {
        let option = document.createElement('option');
        option.value = name;
        dataList.appendChild(option);
    });
}

function decryptData(encryptedData, password) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, password);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        return decryptedData;
    } catch (e) {
        alert('Le mot de passe est incorrect ou les données sont invalides.');
        console.error(e);
        return null;
    }
}

// Fonctions pour le mode démo
function toggleDemoMode() {
    if (demoModeActive) {
        stopDemoMode();
    } else {
        startDemoMode();
    }
}

function startDemoMode() {
    if (!scene.spriteManagers[0] || !scene.spriteManagers[0].sprites.length) {
        alert('Aucune étoile disponible pour le mode démo');
        return;
    }

    demoModeActive = true;
    const demoButton = document.getElementById('demoModeButton');
    demoButton.textContent = 'Arrêter Démo';
    demoButton.style.backgroundColor = '#dc3545'; // Rouge pour arrêter

    createDemoGroups();
    currentDemoGroupIndex = 0;
    nextDemoGroup();
}

function stopDemoMode() {
    demoModeActive = false;
    const demoButton = document.getElementById('demoModeButton');
    demoButton.textContent = 'Mode Démo';
    demoButton.style.backgroundColor = '#28a745'; // Vert pour démarrer

    if (demoInterval) {
        clearTimeout(demoInterval);
        demoInterval = null;
    }
    
    currentDemoGroupIndex = 0;
    console.log('Mode démo arrêté');
}

function createDemoGroups() {
    // Créer des groupes d'étoiles basés sur les types (subType)
    const sprites = scene.spriteManagers[0].sprites.filter(s => s.isVisible);
    const groupsByType = {};
    
    sprites.forEach(sprite => {
        const subType = sprite.metadata ? sprite.metadata.subType : 'DEFAULT';
        if (!groupsByType[subType]) {
            groupsByType[subType] = [];
        }
        groupsByType[subType].push(sprite);
    });

    // Convertir en tableau de groupes et prendre quelques étoiles représentatives de chaque type
    demoGroups = [];
    Object.keys(groupsByType).forEach(subType => {
        const spritesOfType = groupsByType[subType];
        // Prendre jusqu'à 3 étoiles par type pour éviter trop de longueur
        const selectedSprites = spritesOfType.slice(0, Math.min(3, spritesOfType.length));
        
        selectedSprites.forEach(sprite => {
            demoGroups.push({
                sprite: sprite,
                groupName: subType
            });
        });
    });

    console.log(`Mode démo créé avec ${demoGroups.length} étoiles dans ${Object.keys(groupsByType).length} groupes`);
}

async function nextDemoGroup() {
    if (!demoModeActive || currentDemoGroupIndex >= demoGroups.length) {
        stopDemoMode();
        return;
    }

    const currentGroup = demoGroups[currentDemoGroupIndex];
    const spriteName = currentGroup.sprite.name;
    const groupName = currentGroup.groupName;
    
    console.log(`Mode démo: Navigation vers ${spriteName} (groupe: ${groupName}) - ${currentDemoGroupIndex + 1}/${demoGroups.length}`);
    
    // Déplacer la caméra vers l'étoile et attendre que l'animation soit terminée
    await moveCameraToSprite(spriteName);
    
    currentDemoGroupIndex++;
    
    // Attendre la pause de 3 secondes APRÈS que l'animation soit terminée
    demoInterval = setTimeout(() => {
        if (demoModeActive) {
            nextDemoGroup();
        }
    }, demoPauseDuration);
}

//scene.debugLayer.show()
