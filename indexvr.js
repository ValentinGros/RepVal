//http-server -c-1
//http-server -c-1 -S -C cert.pem -K key.pem
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    disableWebGL2Support: false,
});
const scene = new BABYLON.Scene(engine);

// XR Setup
scene.createDefaultXRExperienceAsync({
    floorMeshes: [],
    disableTeleportation: true,
    inputOptions: { doNotLoadControllerMeshes: true },
    optionalFeatures: ["dom-overlay", "keyboard-input", "hand-tracking"],
    domOverlay: { root: document.body }
}).then(xrHelper => {
    console.log("WebXR initialized.");
    // Global reference for left thumbstick
    window.leftThumbstick = null;
    
    // Store global references for keyboard functions
    globalXrHelper = xrHelper;

    // XR legend panel setup (hidden by default)

    // XR scale slider panel setup (hidden by default)
    if (typeof BABYLON.GUI !== "undefined") {
        if (scene.xrScalePanel) {
            scene.xrScalePanel.dispose();
        }
        const xrScalePanel = new BABYLON.GUI.StackPanel();
        xrScalePanel.width = "500px";
        xrScalePanel.height = "120px";
        xrScalePanel.background = "rgba(0,0,0,0.8)";
        xrScalePanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        xrScalePanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        xrScalePanel.isVisible = false;
        xrScalePanel.zIndex = 2000;

        const sliderLabel = new BABYLON.GUI.TextBlock();
        sliderLabel.text = "Scale: 1.00";
        sliderLabel.height = "40px";
        sliderLabel.color = "white";
        sliderLabel.fontSize = 24;
        sliderLabel.marginBottom = "10px";
        xrScalePanel.addControl(sliderLabel);

        const scaleSlider = new BABYLON.GUI.Slider();
        scaleSlider.minimum = -1;
        scaleSlider.maximum = 1;
        scaleSlider.value = 0;
        scaleSlider.height = "40px";
        scaleSlider.width = "400px";
        scaleSlider.color = "#00ff00";
        scaleSlider.background = "#333";
        scaleSlider.thumbWidth = "30px";
        scaleSlider.barOffset = "10px";
        xrScalePanel.addControl(scaleSlider);

        // n is the scale factor range (e.g., 10)
        const n = 10;
        let currentScale = 1;

        scaleSlider.onValueChangedObservable.add(value => {
            // Map slider value: -1 -> 1/n, 0 -> 1, 1 -> n
            let scale;
            if (value < 0) {
                scale = 1 / (1 + Math.abs(value) * (n - 1));
            } else if (value > 0) {
                scale = 1 + value * (n - 1);
            } else {
                scale = 1;
            }
            currentScale = scale;
            sliderLabel.text = "Scale: " + scale.toFixed(2);

        });

        if (!scene.xrScaleTexture) {
            scene.xrScaleTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("XRScaleUI");
        }
        scene.xrScaleTexture.addControl(xrScalePanel);
        scene.xrScalePanel = xrScalePanel;

        // XR: Toggle scale panel with right A button
        xrHelper.input.onControllerAddedObservable.add(ctrl => {
            ctrl.onMotionControllerInitObservable.add(motionController => {
                if (motionController.handness === 'right') {
                    const aButton = motionController.getComponent("a-button");
                    if (aButton) {
                        aButton.onButtonStateChangedObservable.add(() => {
                            if (aButton.pressed) {
                                xrScalePanel.isVisible = !xrScalePanel.isVisible;
                            }
                        });
                    }
                }
            });
        });
    }
    if (typeof BABYLON.GUI !== "undefined") {
        if (scene.xrLegendPanel) {
            scene.xrLegendPanel.dispose();
        }
        const xrLegendPanel = new BABYLON.GUI.StackPanel();
        xrLegendPanel.width = "400px";
        xrLegendPanel.height = "600px";
        xrLegendPanel.background = "rgba(0,0,0,0.7)";
        xrLegendPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        xrLegendPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        xrLegendPanel.isVisible = false; // Hidden by default
        xrLegendPanel.paddingTop = "20px";
        xrLegendPanel.paddingLeft = "20px";
        xrLegendPanel.zIndex = 1000;
        scene.xrLegendPanel = xrLegendPanel;

        // Attach to fullscreen UI
        if (!scene.xrLegendTexture) {
            scene.xrLegendTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("XRLegendUI");
        }
        scene.xrLegendTexture.addControl(xrLegendPanel);

        // Toggle legend with right B button
        xrHelper.input.onControllerAddedObservable.add(ctrl => {
            ctrl.onMotionControllerInitObservable.add(motionController => {
                if (motionController.handness === 'right') {
                    const bButton = motionController.getComponent("b-button");
                    if (bButton) {
                        bButton.onButtonStateChangedObservable.add(() => {
                            if (bButton.pressed) {
                                xrLegendPanel.isVisible = !xrLegendPanel.isVisible;
                            }
                        });
                    }
                }
            });
        });
    }

    // Enable only MOVEMENT feature
    xrHelper.baseExperience.featuresManager.enableFeature(
        BABYLON.WebXRFeatureName.MOVEMENT, 'latest', {
            xrInput: xrHelper.input,
            movementSpeed: 0.4,
            rotationSpeed: 0.1,
            movementOrientationFollowsViewerPose: true
    });

    // Try to enable WebXR keyboard input feature for Meta Quest
    try {
        if (xrHelper.baseExperience.featuresManager.getEnabledFeatures().indexOf(BABYLON.WebXRFeatureName.KEYBOARD_INPUT) === -1) {
            const keyboardFeature = xrHelper.baseExperience.featuresManager.enableFeature(
                BABYLON.WebXRFeatureName.KEYBOARD_INPUT, 'latest', {
                    xrInput: xrHelper.input
                }
            );
            if (keyboardFeature) {
                console.log("WebXR Keyboard Input feature enabled successfully");
            } else {
                console.log("WebXR Keyboard Input feature not available");
            }
        }
    } catch (error) {
        console.log("WebXR Keyboard Input feature not supported:", error);
    }

    // UI Setup
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("SearchUI");
    
    // Configure advanced texture for VR pointer interaction
    advancedTexture.isForeground = false;
    advancedTexture.layer.layerMask = 0x10000000;
    
    const searchPanel = new BABYLON.GUI.StackPanel();
    Object.assign(searchPanel, {
        width: "400px",
        paddingTop: "20px",
        background: "rgba(255,255,255,0.7)",
        isVisible: false, // Hidden by default, shown with X button
        isPointerBlocker: true // Enable pointer blocking for VR interaction
    });
    advancedTexture.addControl(searchPanel);

    // Global variables for suggestions and virtual keyboard
    let suggestionsPanel, currentSuggestions = [], maxSuggestions = 5;
    let virtualKeyboard, keyboardVisible = false;

    // Header
    const header = new BABYLON.GUI.TextBlock();
    Object.assign(header, {
        text: "Recherche de particule",
        height: "40px",
        color: "black",
        fontSize: 20
    });
    searchPanel.addControl(header);

    // Input
    const inputText = new BABYLON.GUI.InputText();
    Object.assign(inputText, {
        width: 0.8,
        maxWidth: 0.8,
        height: "40px",
        color: "black",
        background: "white",
        placeholderText: "Nom de particule...",
        isPointerBlocker: true,
        isHitTestVisible: true // Ensure VR pointer can interact
    });
    
    // Note: Keyboard is now controlled only by X button, not by clicking input field
    // inputText click handlers removed to prevent automatic keyboard display
    
    // Handle focus event (removed keyboard call to prevent recursion)
    inputText.onFocusObservable.add(() => {
        console.log("VR Input field focused");
        // Note: Not calling showVRKeyboard here to prevent recursive calls
    });

    // Handle text input for suggestions with debouncing
    let suggestionTimeout;
    inputText.onTextChangedObservable.add(() => {
        const query = inputText.text.trim();
        
        // Clear previous timeout to debounce
        if (suggestionTimeout) {
            clearTimeout(suggestionTimeout);
        }
        
        if (query.length >= 3) {
            // Debounce suggestions to prevent excessive calls
            suggestionTimeout = setTimeout(() => {
                showSuggestions(query);
            }, 300); // Wait 300ms after user stops typing
        } else {
            hideSuggestions();
        }
    });
    
    searchPanel.addControl(inputText);
    
    // Expose inputText globally for HTML synchronization
    if (!window.scene) window.scene = {};
    window.scene.inputText = inputText;
    
    // Store global reference for keyboard functions
    globalInputText = inputText;

    // Search Button
    const searchBtn = BABYLON.GUI.Button.CreateSimpleButton("searchBtn", "Rechercher");
    Object.assign(searchBtn, {
        width: 0.5,
        height: "40px",
        color: "white",
        background: "#007bff",
        cornerRadius: 5,
        thickness: 0,
        paddingTop: "10px",
        isPointerBlocker: true,
        isHitTestVisible: true // Ensure VR pointer can interact
    });
    searchPanel.addControl(searchBtn);

    // Search Result
    const searchResultText = new BABYLON.GUI.TextBlock();
    Object.assign(searchResultText, {
        height: "30px",
        color: "black",
        text: ""
    });
    searchPanel.addControl(searchResultText);

    // Suggestions Panel (initially hidden)
    suggestionsPanel = new BABYLON.GUI.StackPanel();
    Object.assign(suggestionsPanel, {
        width: "380px",
        maxHeight: "200px",
        background: "rgba(240,240,240,0.95)",
        isVisible: false,
        paddingTop: "5px",
        paddingBottom: "5px",
        isPointerBlocker: true, // Enable pointer blocking for VR interaction
        isHitTestVisible: true // Ensure VR pointer can interact
    });
    searchPanel.addControl(suggestionsPanel);

    // Create VR native keyboard panel positioned below search panel
    const vrKeyboardPanel = new BABYLON.GUI.StackPanel();
    Object.assign(vrKeyboardPanel, {
        width: "600px",
        height: "300px",
        background: "rgba(40, 40, 40, 0.95)",
        isVisible: false,
        paddingTop: "10px",
        paddingBottom: "10px",
        paddingLeft: "10px",
        paddingRight: "10px",
        isPointerBlocker: true,
        isHitTestVisible: true
    });
    
    // Position VR keyboard below search panel
    vrKeyboardPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    vrKeyboardPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    vrKeyboardPanel.top = "450px"; // Position below search panel
    
    advancedTexture.addControl(vrKeyboardPanel);
    
    // Create keyboard layout
    createVRKeyboard(vrKeyboardPanel);
    
    virtualKeyboard = vrKeyboardPanel;
    keyboardVisible = false;
    
    // Expose all variables globally for testing (after full initialization)
    window.searchPanel = searchPanel;
    window.inputText = inputText;
    window.searchResultText = searchResultText;
    window.virtualKeyboard = virtualKeyboard;
    window.suggestionsPanel = suggestionsPanel;

    // Note: Keyboard functions moved to global scope for proper accessibility

    // Keep panel facing camera and position keyboard relative to panel
    scene.onBeforeRenderObservable.add(() => {
        if (searchPanel.isVisible) {
            const cam = scene.activeCamera;
            
            // Ensure GUI layer is visible to VR cameras
            if (xrHelper && xrHelper.baseExperience && xrHelper.baseExperience.camera) {
                advancedTexture.layer.layerMask = 0x0FFFFFFF; // Make visible to all cameras
            } else {
                advancedTexture.layer.layerMask = cam.layerMask;
            }
            
            searchPanel.linkWithMesh(null);
            searchPanel.isVertical = true;
            
            // Position HTML keyboard below the search panel in VR
            const keyboardElement = document.getElementById('virtualKeyboardHTML');
            if (keyboardElement && window.htmlKeyboardVisible) {
                // Calculate position relative to search panel
                const searchContainer = document.getElementById('searchContainer');
                if (searchContainer) {
                    const searchRect = searchContainer.getBoundingClientRect();
                    keyboardElement.style.top = (searchRect.bottom + 20) + 'px';
                    keyboardElement.style.left = searchRect.left + 'px';
                    keyboardElement.style.transform = 'none';
                    keyboardElement.style.position = 'fixed';
                }
            }
        }
    });

    // Search action with protection against freezes
    let searchInProgress = false;
    searchBtn.onPointerUpObservable.add(() => {
        // Prevent multiple simultaneous searches
        if (searchInProgress) {
            console.log("Search already in progress, skipping...");
            return;
        }
        
        const query = inputText.text.trim();
        if (query) {
            searchInProgress = true;
            hideSuggestions();
            
            try {
                // Use setTimeout to prevent UI freeze
                setTimeout(() => {
                    try {
                        moveCameraToSprite(query);
                        searchResultText.text = "Recherche : " + query;
                    } catch (error) {
                        console.error("Error during camera movement:", error);
                        searchResultText.text = "Erreur lors de la recherche";
                    } finally {
                        searchInProgress = false;
                    }
                }, 10);
            } catch (error) {
                console.error("Error initiating search:", error);
                searchResultText.text = "Erreur lors de la recherche";
                searchInProgress = false;
            }
        } else {
            searchResultText.text = "Entrer un nom valide.";
        }
    });

    // Toggle panel with X button (Quest 3)
    xrHelper.input.onControllerAddedObservable.add(ctrl => {
        ctrl.onMotionControllerInitObservable.add(motionController => {
            if (motionController.handness === 'left') {
                // Debug: log all available components for this controller
                console.log("Left controller components:", Object.keys(motionController.components));
                const xButtonComponent = motionController.getComponent("x-button");
                if (xButtonComponent) {
                    xButtonComponent.onButtonStateChangedObservable.add(() => {
                        if (xButtonComponent.pressed) {
                            try {
                                const wasVisible = searchPanel.isVisible;
                                searchPanel.isVisible = !searchPanel.isVisible;
                                
                                if (searchPanel.isVisible) {
                                    // Opening panel and showing Meta keyboard
                                    inputText.text = "";
                                    searchResultText.text = "";
                                    
                                    // Show Meta WebXR keyboard when panel opens
                                    showVirtualKeyboardGlobal();
                                    console.log("Search panel and Meta keyboard opened with X button");
                                } else {
                                    // Closing panel - hide keyboard immediately
                                    try {
                                        hideSuggestions();
                                        hideVirtualKeyboardGlobal();
                                        console.log("Search panel and Meta keyboard closed with X button");
                                    } catch (error) {
                                        console.error("Error closing keyboard:", error);
                                    }
                                }
                            } catch (error) {
                                console.error("Error in X button handler:", error);
                            }
                        }
                    });
                }
            }
            
            // Note: Triggers no longer show keyboard - only X button controls keyboard
            // Trigger handlers removed to ensure keyboard is only controlled by X button
            
            // Add left joystick up/down to z translation
            const thumbstick = motionController.getComponent("xr-standard-thumbstick");
            if (thumbstick) {
                window.leftThumbstick = thumbstick;
            }
        });
    });

    // Enable POINTER_SELECTION for controller pointer ray selection
    const pointerSelection = xrHelper.baseExperience.featuresManager.enableFeature(
        BABYLON.WebXRFeatureName.POINTER_SELECTION, 'latest', {
            xrInput: xrHelper.input,
            enablePointerSelectionOnAllControllers: true,
            preferredHandedness: "none", // Allow both hands
            gazeCamera: scene.activeCamera,
            disablePointerUpOnTouchOut: false,
            overrideButtonId: "xr-standard-trigger"
        }
    );
    
    // Configure pointer selection to work with GUI
    if (pointerSelection) {
        pointerSelection.attach();
        console.log("VR Pointer selection enabled for GUI interaction");
    }
});

// Function to create VR native keyboard layout
function createVRKeyboard(keyboardPanel) {
    const keys = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫', '↵']
    ];
    
    keys.forEach((row, rowIndex) => {
        const rowPanel = new BABYLON.GUI.StackPanel();
        rowPanel.isVertical = false;
        rowPanel.height = "60px";
        rowPanel.paddingBottom = "5px";
        
        row.forEach(keyText => {
            const keyButton = BABYLON.GUI.Button.CreateSimpleButton(`key_${keyText}`, keyText);
            Object.assign(keyButton, {
                width: keyText === '⌫' || keyText === '↵' ? "80px" : "50px",
                height: "50px",
                color: "white",
                background: "rgba(70, 70, 70, 0.9)",
                cornerRadius: 8,
                thickness: 1,
                fontSize: 18,
                marginLeft: "2px",
                marginRight: "2px",
                isPointerBlocker: true,
                isHitTestVisible: true
            });
            
            // Add hover effect
            keyButton.onPointerEnterObservable.add(() => {
                keyButton.background = "rgba(120, 120, 120, 1.0)";
            });
            
            keyButton.onPointerOutObservable.add(() => {
                keyButton.background = "rgba(70, 70, 70, 0.9)";
            });
            
            // Handle key press
            keyButton.onPointerClickObservable.add(() => {
                handleVRKeyPress(keyText);
            });
            
            rowPanel.addControl(keyButton);
        });
        
        keyboardPanel.addControl(rowPanel);
    });
    
    // Add space bar
    const spaceRow = new BABYLON.GUI.StackPanel();
    spaceRow.isVertical = false;
    spaceRow.height = "60px";
    
    const spaceButton = BABYLON.GUI.Button.CreateSimpleButton("key_space", "⎵ SPACE");
    Object.assign(spaceButton, {
        width: "300px",
        height: "50px",
        color: "white",
        background: "rgba(70, 70, 70, 0.9)",
        cornerRadius: 8,
        thickness: 1,
        fontSize: 16,
        isPointerBlocker: true,
        isHitTestVisible: true
    });
    
    spaceButton.onPointerEnterObservable.add(() => {
        spaceButton.background = "rgba(120, 120, 120, 1.0)";
    });
    
    spaceButton.onPointerOutObservable.add(() => {
        spaceButton.background = "rgba(70, 70, 70, 0.9)";
    });
    
    spaceButton.onPointerClickObservable.add(() => {
        handleVRKeyPress(' ');
    });
    
    spaceRow.addControl(spaceButton);
    keyboardPanel.addControl(spaceRow);
}

// Function to handle VR keyboard key presses
function handleVRKeyPress(key) {
    try {
        if (globalInputText) {
            const currentValue = globalInputText.text || '';
            
            switch(key) {
                case '⌫': // Backspace
                    globalInputText.text = currentValue.slice(0, -1);
                    break;
                case '↵': // Enter
                    // Trigger search
                    if (currentValue.trim()) {
                        moveCameraToSprite(currentValue.trim());
                        if (window.searchResultText) {
                            window.searchResultText.text = "Recherche : " + currentValue.trim();
                        }
                    }
                    break;
                case ' ': // Space
                    globalInputText.text = currentValue + ' ';
                    break;
                default:
                    globalInputText.text = currentValue + key.toLowerCase();
                    break;
            }
            
            // Synchronize with HTML input
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = globalInputText.text;
            }
            
            console.log("VR Key pressed:", key, "Current text:", globalInputText.text);
        }
    } catch (error) {
        console.error("Error handling VR key press:", error);
    }
}

// Function to show VR virtual keyboard (integrated)
let keyboardRequestInProgress = false;

function showVRKeyboard(inputElement) {
    // Prevent recursive calls
    if (keyboardRequestInProgress) {
        console.log("Keyboard request already in progress, skipping...");
        return;
    }
    
    keyboardRequestInProgress = true;
    console.log("Showing integrated VR keyboard");
    
    try {
        // Focus the input element
        if (inputElement && inputElement.focus) {
            inputElement.focus();
        }
        
        // Show the integrated virtual keyboard
        showVirtualKeyboardGlobal();
        
    } catch (e) {
        console.error("Error showing VR keyboard:", e);
    } finally {
        // Reset the flag after a short delay
        setTimeout(() => {
            keyboardRequestInProgress = false;
        }, 200);
    }
}

// Function to show suggestions based on input
function showSuggestions(query) {
    try {
        // Prevent suggestions if panel is not visible
        if (!searchPanel.isVisible) {
            return;
        }
        
        // Get all available sprite names (cached for performance)
        const allSprites = getAllSprites();
        if (!allSprites || allSprites.length === 0) {
            hideSuggestions();
            return;
        }
        
        // Limit the search to visible sprites and use more efficient filtering
        const queryLower = query.toLowerCase();
        const matches = [];
        
        // Use a more efficient loop with early exit
        for (let i = 0; i < allSprites.length && matches.length < maxSuggestions; i++) {
            const sprite = allSprites[i];
            if (sprite.isVisible && sprite.name && sprite.name.toLowerCase().includes(queryLower)) {
                matches.push(sprite.name);
            }
        }
        
        // Clear existing suggestions
        suggestionsPanel.clearControls();
        currentSuggestions = [];
        
        if (matches.length > 0) {
            matches.forEach((match, index) => {
                const suggestionButton = BABYLON.GUI.Button.CreateSimpleButton(`suggestion_${index}`, match);
                Object.assign(suggestionButton, {
                    width: "360px",
                    height: "30px",
                    color: "black",
                    background: "rgba(255,255,255,0.8)",
                    cornerRadius: 3,
                    thickness: 1,
                    paddingTop: "2px",
                    paddingBottom: "2px",
                    isPointerBlocker: true, // Enable pointer blocking for VR interaction
                    isHitTestVisible: true // Ensure VR pointer can interact
                });
                
                // Add hover effect
                suggestionButton.onPointerEnterObservable.add(() => {
                    suggestionButton.background = "rgba(200,220,255,0.9)";
                });
                
                suggestionButton.onPointerOutObservable.add(() => {
                    suggestionButton.background = "rgba(255,255,255,0.8)";
                });
                
                // Handle click on suggestion
                suggestionButton.onPointerClickObservable.add(() => {
                    inputText.text = match;
                    hideSuggestions();
                    moveCameraToSprite(match);
                    searchResultText.text = "Recherche : " + match;
                });
                
                suggestionsPanel.addControl(suggestionButton);
                currentSuggestions.push(match);
            });
            
            suggestionsPanel.isVisible = true;
        } else {
            suggestionsPanel.isVisible = false;
        }
    } catch (error) {
        console.error("Error in showSuggestions:", error);
        hideSuggestions();
    }
}

// Function to hide suggestions
function hideSuggestions() {
    suggestionsPanel.isVisible = false;
    suggestionsPanel.clearControls();
    currentSuggestions = [];
}

scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

// Test function to simulate X button press (for testing without VR headset)
window.testXButton = function() {
    console.log("Testing X button press simulation...");
    if (window.searchPanel) {
        const wasVisible = window.searchPanel.isVisible;
        window.searchPanel.isVisible = !window.searchPanel.isVisible;
        
        if (window.searchPanel.isVisible) {
            window.inputText.text = "";
            window.searchResultText.text = "";
            
            // Show Meta keyboard when panel opens (simulate X button behavior)
            if (window.inputText) {
                window.inputText.focus();
                console.log("Search panel and Meta keyboard opened (test)");
            }
        } else {
            try {
                // Hide Meta keyboard when panel closes
                if (window.inputText) {
                    window.inputText.blur();
                }
                console.log("Search panel and Meta keyboard closed (test)");
            } catch (error) {
                console.error("Error closing keyboard (test):", error);
            }
        }
    } else {
        console.error("searchPanel not available");
    }
};

// Test function to show Meta VR keyboard (for testing)
window.testShowKeyboard = function() {
    console.log("Testing Meta WebXR keyboard display...");
    if (window.searchPanel && window.searchPanel.isVisible) {
        // Simulate showing Meta WebXR keyboard
        if (window.inputText) {
            window.inputText.focus();
            console.log("Meta WebXR keyboard triggered (test)");
        } else {
            console.error("inputText not available");
        }
    } else {
        console.log("Search panel must be open first");
    }
};

// Restore default movement, but add z translation for left joystick up/down
scene.onBeforeRenderObservable.add(() => {
    if (typeof xrHelper !== "undefined" && xrHelper.input && xrHelper.input.controllers) {
        const leftController = xrHelper.input.controllers.find(c => c.inputSource.handedness === "left");
        if (leftController && leftController.motionController) {
            const thumbstick = leftController.motionController.getComponent("xr-standard-thumbstick");
            if (thumbstick && thumbstick.axes) {
                const axis = thumbstick.axes;
                const zDelta = -axis[1] * 0.1; // Adjust speed as needed
                if (Math.abs(axis[1]) > 0.05 && scene.activeCamera) {
                    scene.activeCamera.position.z += zDelta;
                }
            }
        }
    }
});

var camera = new BABYLON.UniversalCamera("MyCamera", new BABYLON.Vector3(0, 1, 0), scene);
camera.minZ = 0.0001;
camera.attachControl(canvas, true);
camera.speed = 0.9;
camera.angularSpeed = 0.05;
camera.angle = Math.PI / 2;
camera.direction = new BABYLON.Vector3(Math.cos(camera.angle), 0, Math.sin(camera.angle));


// Global click handler for sprite selection
scene.onPointerObservable.add((pointerInfo) => {
  switch (pointerInfo.type) {
    case BABYLON.PointerEventTypes.POINTERPICK:
      if (pointerInfo.pickInfo && pointerInfo.pickInfo.pickedSprite) {
        // Select the picked sprite (particle)
        const pickedName = pointerInfo.pickInfo.pickedSprite.name;
        console.log('Sprite clicked in VR:', pickedName);
        
        // Update search input if it exists
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.value = pickedName;
        }
        
        // Move camera to the clicked sprite
        moveCameraToSprite(pickedName);
      }
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

//var font = "Calibri 20px monospace";

const scatter = new BABYLON.PointsCloudSystem("scatter", 0, scene);

const labelSprites = [];
const originalPositions = [];

// Global function to get all sprites from all managers
function getAllSprites() {
    const allSprites = [];
    if (scene && scene.spriteManagers) {
        scene.spriteManagers.forEach(manager => {
            if (manager.sprites) {
                allSprites.push(...manager.sprites);
            }
        });
    }
    return allSprites;
}

// Create scatter mesh and label sprites
//const imageUrl = 'bubble12.png';
//const imageSize = 5000;

// Default values - will be overridden by individual sprite images
const defaultImageSize = 640;
const spriteRatio = 2;



// Function to ensure minimum distance between sprites
async function adjustPositionsForMinimumDistance(data, minDistance = 8) {
    // Skip adjustment for large datasets to prevent freezes
    if (data.length > 1000) {
        console.log("Skipping position adjustment for large dataset to prevent freeze");
        return data;
    }
    
    const adjustedData = [...data];
    const maxIterations = Math.min(20, Math.floor(data.length / 10)); // Adaptive max iterations
    let iteration = 0;
    let progressThreshold = 0.05; // Increased threshold for faster exit
    let lastCollisionCount = Infinity;
    
    while (iteration < maxIterations) {
        let hasCollisions = false;
        let collisionCount = 0;
        
        // Process in smaller batches with yield to prevent UI freezing
        const batchSize = Math.min(25, adjustedData.length); // Smaller batch size
        
        for (let batch = 0; batch < adjustedData.length; batch += batchSize) {
            const endBatch = Math.min(batch + batchSize, adjustedData.length);
            
            // Yield control to prevent UI freeze
            if (batch > 0 && batch % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
            
            for (let i = batch; i < endBatch; i++) {
                // Limit inner loop for performance
                const maxJ = Math.min(i + 50, adjustedData.length);
                for (let j = i + 1; j < maxJ; j++) {
                    const sprite1 = adjustedData[i];
                    const sprite2 = adjustedData[j];
                    
                    const dx = sprite1.x - sprite2.x;
                    const dy = sprite1.y - sprite2.y;
                    const dz = sprite1.z - sprite2.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    
                    if (distance < minDistance && distance > 0.001) {
                        hasCollisions = true;
                        collisionCount++;
                        
                        // Simplified movement calculation
                        const length = distance || 0.001;
                        const overlap = minDistance - distance;
                        const moveDistance = Math.min(overlap * 0.2, 1); // Reduced movement
                        
                        const factor = moveDistance / length;
                        sprite1.x += dx * factor;
                        sprite1.y += dy * factor;
                        sprite1.z += dz * factor;
                        
                        sprite2.x -= dx * factor;
                        sprite2.y -= dy * factor;
                        sprite2.z -= dz * factor;
                    }
                }
            }
        }
        
        // Early exit conditions
        const progress = (lastCollisionCount - collisionCount) / Math.max(lastCollisionCount, 1);
        if (!hasCollisions || (iteration > 5 && progress < progressThreshold)) {
            break;
        }
        
        lastCollisionCount = collisionCount;
        iteration++;
    }
    
    console.log(`Position adjustment completed after ${iteration} iterations (${lastCollisionCount} remaining collisions)`);
    return adjustedData;
}

async function main(currentData, ratio) {
    // Charger la configuration des images personnalisées
    const imageConfiguration = loadImageConfiguration();
    
    // Prepare data with scaled positions and color
    let data = currentData.map(d => ({
        ...d,
        x: d.x * ratio,
        y: d.y * ratio,
        z: d.z * ratio,
        color: getColor(d.subType),
        metadata: { subType: d.subType },
        // Utiliser l'image personnalisée si disponible, sinon utiliser l'image par défaut
        imageFile: imageConfiguration[d.level] || d.imageFile || getDefaultImageForLevel(d.level)
    }));
    
    // Adjust positions to ensure minimum distance of 8 between sprites
    data = await adjustPositionsForMinimumDistance(data, 8);

    // Group data by level to create separate sprite managers for each PNG
    const dataByLevel = {};
    data.forEach(d => {
        const level = d.level || 5; // Default to level 5 if no level specified
        const imageFile = d.imageFile; // Image déjà déterminée ci-dessus
        if (!dataByLevel[level]) {
            dataByLevel[level] = {
                imageFile: imageFile,
                elements: []
            };
        }
        dataByLevel[level].elements.push(d);
    });

    // Create sprite managers for each level
    const spriteManagers = {};
    Object.keys(dataByLevel).forEach(level => {
        const levelData = dataByLevel[level];
        const spriteManager = new BABYLON.SpriteManager(
            `labelSpriteManager_level_${level}`,
            levelData.imageFile,
            levelData.elements.length,
            defaultImageSize,
            scene
        );
        spriteManager.isPickable = true;
        spriteManagers[level] = spriteManager;
    });


    // Helper to create a sprite and attach actions
    function createLabelSprite(point, idx, spriteManager) {
        const position = new BABYLON.Vector3(point.x, point.y, point.z);
        originalPositions.push(position.clone());

        // Calculate size based on level: level 1 = 6, level 2 = 5.5, level 3 = 5, etc.
        const level = point.level || 5;
        const spriteSize = level === 1 ? 12 : Math.max(1, 6.5 - (level * 0.5)); // Level 1 = 12, others use original formula

        const sprite = new BABYLON.Sprite(point.prefLabel, spriteManager);
        Object.assign(sprite, {
            isPickable: true,
            position,
            originalPosition: originalPositions[idx],
            size: spriteSize,
            color: new BABYLON.Color4(point.color.r, point.color.g, point.color.b, 1),
            metadata: { subType: point.subType, level: point.level },
            isVisible: true
        });

        sprite.actionManager = new BABYLON.ActionManager(scene);

        // Mouse over: update nearest list and search input
        sprite.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            evt => {
                const spriteName = evt.source.name;
                const allSprites = getAllSprites();
                const targetSprite = allSprites.find(s => s.name === spriteName);
                if (targetSprite) {
                    const distances = allSprites.filter(s => s.isVisible).map(s => ({
                        name: s.name,
                        distance: BABYLON.Vector3.Distance(targetSprite.originalPosition, s.originalPosition)
                    })).sort((a, b) => a.distance - b.distance);
                    updateNearestList(distances, spriteName, targetSprite.metadata.subType);
                    
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = spriteName;
                    }
                }
            }
        ));

        // Click: move camera to sprite (OnPickTrigger for better click detection)
        sprite.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            evt => {
                const spriteName = evt.source.name;
                console.log('VR Sprite clicked via ActionManager:', spriteName);
                
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = spriteName;
                }
                moveCameraToSprite(spriteName);
            }
        ));

        // Alternative click handler for better compatibility
        sprite.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickUpTrigger,
            evt => {
                const spriteName = evt.source.name;
                console.log('VR Sprite clicked via OnPickUpTrigger:', spriteName);
                
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = spriteName;
                }
                moveCameraToSprite(spriteName);
            }
        ));

        labelSprites.push(sprite);
    }

    scatter.addPoints(data.length, (particle) => {
        const point = data[particle.idx];
        const level = point.level || 5; // Default to level 5 if no level specified
        const spriteManager = spriteManagers[level];
        
        createLabelSprite(point, particle.idx, spriteManager);
        particle.position = originalPositions[particle.idx];
    });

scene.onBeforeRenderObservable.add(() => {
	
	updateSpritePositions();
	
	frameCounter++;
    if (frameCounter > frameThreshold) {
        frameCounter = 0;  // Réinitialise le compteur
		
    var names = [];

    // CETTE ligne-ci est critique :
    const camera = scene.activeCamera; 
	
		const cameraDirection = camera.getForwardRay().direction.normalize();
		const fov = camera.fov; // Champs de vision de la caméra
		const cameraPosition = camera.position;
	
    getAllSprites().map(s => {
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
            // Get sprite level for size calculation
            const spriteLevel = s.metadata && s.metadata.level ? s.metadata.level : 5;
            const spriteSize = spriteLevel === 1 ? 12 : Math.max(1, 6.5 - (spriteLevel * 0.5));
            
            names.push({
                "name": s.name + '_layer',
                "meshName": s.name + '_whoz_mesh',
                "matName": s.name + '_whoz_mat',
                "textureName": s.name,
    "color": s.color,
                "position": s.position,
                "level": spriteLevel,
                "spriteSize": spriteSize
            });
        }
    });

    // Dispose of unused meshes
    scene.meshes
        .filter(mesh => mesh.name.endsWith('_whoz_mesh') && !names.some(n => n.meshName === mesh.name))
        .forEach(mesh => {
            if (mesh.material) {
                if (mesh.material.emissiveTexture) {
                    mesh.material.emissiveTexture.dispose(); // Dispose the emissive texture
                }
                mesh.material.dispose(); // Dispose the material
            }
            scene.removeMesh(mesh);
            mesh.dispose(); // Dispose the mesh
        });

    // Dispose of unused materials
    scene.materials
        .filter(material => material.name.endsWith('_whoz_mat') && !names.some(n => n.matName === material.name))
        .forEach(material => {
            if (material.emissiveTexture) {
                material.emissiveTexture.dispose(); // Dispose the emissive texture
            }
            scene.removeMaterial(material);
            material.dispose(); // Dispose the material
        });

    names.forEach(n => {
        if (!scene.meshes.some(l => l.name === n.meshName)) {
            const font_size = 12;
            // Scale the parentheses radius based on sprite size (tripled)
            const baseRadius = 90; // Tripled from 30 to 90
            const scaledRadius = baseRadius * (n.spriteSize / 4); // Scale relative to default size 4
            
            const planeTexture = new BABYLON.DynamicTexture("dynamic texture", font_size*100, scene, true, BABYLON.DynamicTexture.TRILINEAR_SAMPLINGMODE);
   
   var textureContext = planeTexture.getContext();
   
   //Draw on canvas - scaled parentheses with cyan color and black border
   // Draw black border first (thicker)
   textureContext.lineWidth = 3; // Thicker for border effect
   textureContext.strokeStyle = "black";
   textureContext.beginPath();
   textureContext.arc(font_size*50, font_size*50, scaledRadius, -Math.PI/5, Math.PI/5);
   textureContext.stroke();
   
   textureContext.beginPath();
   textureContext.arc(font_size*50, font_size*50, scaledRadius, -Math.PI/5 + Math.PI, Math.PI/5 + Math.PI);
   textureContext.stroke();
   
   // Draw white parentheses on top
   textureContext.lineWidth = 2; // Original thickness for white
   textureContext.strokeStyle = "white";
   textureContext.beginPath();
   textureContext.arc(font_size*50, font_size*50, scaledRadius, -Math.PI/5, Math.PI/5);
   textureContext.stroke();
   
   textureContext.beginPath();
   textureContext.arc(font_size*50, font_size*50, scaledRadius, -Math.PI/5 + Math.PI, Math.PI/5 + Math.PI);
   textureContext.stroke();
   
   planeTexture.update();
   
   
            // Draw text with stroke (border) first, then fill
            const textY = font_size * 53; // Center the sprite name
            const fontSize = font_size;
            const fontFamily = "FreeMono, monospace";
            const textToDisplay = n.textureName.toUpperCase(); // Convert to uppercase
            
            // Set font for measurements
            textureContext.font = fontSize + "px " + fontFamily;
            
            // Draw sprite name with black stroke (border) first
            textureContext.strokeStyle = "black";
            textureContext.lineWidth = 1;
            textureContext.strokeText(textToDisplay, null, textY);
            
            // Draw white fill text on top for sprite name
            planeTexture.drawText(textToDisplay, null, textY, fontSize + "px " + fontFamily, "white", "transparent", true, true);
            var material = new BABYLON.StandardMaterial(n.textureName + '_whoz_mat', scene);
            material.emissiveTexture = planeTexture;
            material.opacityTexture = planeTexture;
            material.backFaceCulling = true;
            material.disableLighting = true;
            material.freeze();

   var outputplane = BABYLON.Mesh.CreatePlane(n.textureName + '_whoz_mesh', font_size, scene, false);
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

    const searchInput = document.getElementById('searchInput');
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

});

loadFileButton.addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (file) {
        try {
            const reader = new FileReader();
            reader.onload = async function(event) {
                const newdata = JSON.parse(event.target.result);
                await main(newdata, 20);
                document.getElementById('fileInputContainer').style.display = 'none';
                
                // Initialize Meta keyboard in VR environment after data load
                initializeMetaKeyboardInVR();
            };
            reader.readAsText(file);
        } catch (error) {
            alert('An error occurred while parsing the file.');
            console.error(error);
        }
    } else {
        try {
			
			// Try to load encrypted data first, fallback to test data with levels
			try {
				const response = await fetch('./encrypted_PSO_0.json');
				const encryptedData = await response.text();
				const password = await showPasswordModal();
				const data = decryptData(encryptedData, password);
				await main(data, 20);
			} catch (encryptedError) {
				console.log("Encrypted data not available, loading test data with levels");
				const response = await fetch('./test_data_with_levels.json');
				const data = await response.json();
				await main(data, 20);
			}
            document.getElementById('fileInputContainer').style.display = 'none';
            
            // Initialize Meta keyboard in VR environment after data load
            initializeMetaKeyboardInVR();
        } catch (error) {
            console.error("Failed to load JSON:", error);
        }
    }
});

const generatedColors = {};
function getColor(type) {
    // No hardcoded colors, all subTypes get random colors

    if (generatedColors[type]) {
        return generatedColors[type];
    }
    // Generate and store a random color for this subType
    const randColor = {
        r: Math.random(),
        g: Math.random(),
        b: Math.random()
    };
    generatedColors[type] = randColor;
    return randColor;
}

// Update sprite positions to add small movements and orbital mechanics
function updateSpritePositions() {
    time += 0.004;
	const camera = scene.activeCamera;
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
				const spriteLevel = sprite.metadata && sprite.metadata.level ? sprite.metadata.level : 5;
				
				// Find nearby higher level sprites to orbit around
				let orbitCenter = null;
				let bestLevel = Infinity; // Track the highest level (lowest number)
				let minDistance = Infinity;
				
				labelSprites.forEach((otherSprite, otherIdx) => {
					if (otherSprite !== sprite && otherSprite.metadata && otherSprite.metadata.level) {
						const otherLevel = otherSprite.metadata.level;
						// Only orbit around sprites with higher level (lower number = higher level)
						if (otherLevel < spriteLevel) {
							const distanceToOther = BABYLON.Vector3.Distance(originalPosition, originalPositions[otherIdx]);
							// Only consider sprites within orbital range (adjust this value as needed)
							if (distanceToOther < 15) {
								// Prioritize higher level (lower number) first, then closer distance
								if (otherLevel < bestLevel || (otherLevel === bestLevel && distanceToOther < minDistance)) {
									bestLevel = otherLevel;
									minDistance = distanceToOther;
									orbitCenter = originalPositions[otherIdx];
								}
							}
						}
					}
				});
				
				if (orbitCenter) {
					// Orbital motion around higher level sprite
					const orbitRadius = spriteLevel === 1 ? Math.min(minDistance * 5.6, 64) : Math.min(minDistance * 0.7, 8); // Level 1 has octuple orbit radius
					const orbitSpeed = 0.5 + (13 - spriteLevel) * 0.1; // Lower levels orbit faster
					const orbitAngle = time * orbitSpeed + idx * 0.5; // Offset each sprite's orbit
					
					sprite.position.x = orbitCenter.x + orbitRadius * Math.cos(orbitAngle);
					sprite.position.y = orbitCenter.y + orbitRadius * Math.sin(orbitAngle) * 0.5; // Flatten Y orbit
					sprite.position.z = orbitCenter.z + orbitRadius * Math.sin(orbitAngle);
				} else {
					// Default floating motion for sprites without orbital targets
					sprite.position.x = originalPosition.x + 0.8 * Math.sin(time + idx);
					sprite.position.y = originalPosition.y + 0.8 * Math.cos(time + idx);
					sprite.position.z = originalPosition.z + 0.8 * Math.sin(time + idx);
				}
				
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
    // Clear any existing blink interval to prevent memory leaks
    if (sprite.blinkInterval) {
        clearInterval(sprite.blinkInterval);
    }
    
    let isDefaultColor = true; // État du sprite, vrai si la couleur par défaut est affichée
    const defaultColor = sprite.color;
    const highlightColor = new BABYLON.Color4(1, 1, 1, 1);
	const mediumMediumlightColor = new BABYLON.Color4((sprite.color.r+1)/2, (sprite.color.g+1)/2, (sprite.color.b+1)/2, (sprite.color.a+1)/2);
	const mediumLowlightColor = new BABYLON.Color4((3*sprite.color.r+1)/4, (3*sprite.color.g+1)/4, (3*sprite.color.b+1)/4, (3*sprite.color.a+1)/4);
	const mediumHighlightColor = new BABYLON.Color4((sprite.color.r+3)/4, (sprite.color.g+3)/4, (sprite.color.b+3)/4, (sprite.color.a+3)/4);

    let localBlinkCount = 0;
    const maxBlinks = 16; // Limit blink duration to prevent infinite blinking

    // Configure l'intervalle de clignotement
    sprite.blinkInterval = setInterval(() => {
		localBlinkCount++;
		
		var moduloBlink = localBlinkCount % 8;
		
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
        
        // Stop blinking after maxBlinks and restore default color
        if (localBlinkCount >= maxBlinks) {
            sprite.color = defaultColor;
            clearInterval(sprite.blinkInterval);
            sprite.blinkInterval = null;
        }
    }, 200); // Durée du clignotement en millisecondes
}

function moveCameraToSprite(spriteName) {
    try {
        console.log('Moving VR camera to sprite:', spriteName);

        const camera = scene.activeCamera;
        if (!camera) {
            console.error("No active camera found");
            return;
        }
        
        // Get all sprites from all managers with timeout protection
        const sprites = getAllSprites();
        if (!sprites || sprites.length === 0) {
            console.error("No sprites available");
            return;
        }
        
        let targetSprite = sprites.find(s => s.name === spriteName);

        if (targetSprite) {
            console.log('VR Target sprite found:', targetSprite.name, 'at position:', targetSprite.position);
            
            const targetPosition = new BABYLON.Vector3(targetSprite.position.x, targetSprite.position.y, targetSprite.position.z);
            const cameraStartPosition = camera.position.clone();
            const cameraStartTarget = camera.getTarget().clone();

            const bufferDistance = 9; // Distance from sprite
            const directionVector = targetPosition.subtract(camera.position).normalize();
            const adjustedTargetPosition = targetPosition.subtract(directionVector.scale(bufferDistance));

            const moveDistance = BABYLON.Vector3.Distance(cameraStartPosition, adjustedTargetPosition);
            const numberOfFrames = Math.min(85, Math.max(10, Math.round(moveDistance)));
            
            console.log('VR Animation frames:', numberOfFrames, 'Distance:', moveDistance);
            
            // Stop any existing animations
            scene.stopAnimation(camera);
            
            // Create animation for camera position
            const animCamPosition = new BABYLON.Animation("animCamPosition", "position", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            animCamPosition.setKeys([
                {frame: 0, value: cameraStartPosition},
                {frame: numberOfFrames, value: adjustedTargetPosition}
            ]);

            // Create animation for camera target
            const animCamTarget = new BABYLON.Animation("animCamTarget", "target", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            animCamTarget.setKeys([
                {frame: 0, value: cameraStartTarget},
                {frame: numberOfFrames, value: targetPosition}
            ]);

            // Start the animation
            const animationGroup = scene.beginDirectAnimation(camera, [animCamPosition, animCamTarget], 0, numberOfFrames, false);
            
            // Add completion callback
            animationGroup.onAnimationEndObservable.add(() => {
                console.log('VR Camera animation completed');
            });

            // Make the sprite blink to indicate selection
            blinkSprite(targetSprite);

            // Find and update nearest particles list with protection
            try {
                const visibleSprites = sprites.filter(s => s.isVisible);
                if (visibleSprites.length > 0 && targetSprite.originalPosition) {
                    let distances = visibleSprites.map(sprite => {
                        return {
                            name: sprite.name,
                            distance: BABYLON.Vector3.Distance(targetSprite.originalPosition, sprite.originalPosition)
                        };
                    });
                    distances.sort((a, b) => a.distance - b.distance);
                    
                    updateNearestList(distances, spriteName, targetSprite.metadata.subType);
                }
            } catch (nearestError) {
                console.error("Error updating nearest list:", nearestError);
            }
            
        } else {
            console.error("VR Sprite not found:", spriteName);
            console.log("Available VR sprites:", sprites.slice(0, 10).map(s => s.name)); // Limit log output
        }
    } catch (error) {
        console.error("Error in moveCameraToSprite:", error);
    }
}

function updateNearestList(distances, spriteName, subType) {
		// Get top 100 nearest particles
        let nearestParticles = distances.slice(1, 101);

        // Update the nearest list
		const nearestList = document.getElementById('nearestList');
			nearestList.innerHTML = '';
			let i=0;
			
			
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
					const searchInput = document.getElementById('searchInput');
					if (searchInput) {
						searchInput.value = particle.name;
					}
					moveCameraToSprite(particle.name);
				});

			nearestList.appendChild(listItem);
		});
}

function createLegend(data) {
    const uniqueTypes = [...new Set(data.map(item => item.subType))];
    const legendContainer = document.getElementById('legend');
    legendContainer.innerHTML = '';

    // Fill XR legend panel if it exists
    if (scene.xrLegendPanel) {
        scene.xrLegendPanel.clearControls();
        uniqueTypes.sort().forEach(type => {
            const color = getColor(type);
            const legendItem = new BABYLON.GUI.StackPanel();
            legendItem.isVertical = false;
            legendItem.height = "30px";
            legendItem.paddingBottom = "5px";

            const colorBox = new BABYLON.GUI.Rectangle();
            colorBox.width = "30px";
            colorBox.height = "30px";
            colorBox.color = "white";
            colorBox.thickness = 1;
            // Set initial opacity based on state
            if (!window.xrLegendActiveTypes) window.xrLegendActiveTypes = {};
            const isActive = window.xrLegendActiveTypes[type] !== false;
            colorBox.background = `rgba(${Math.round(color.r*255)},${Math.round(color.g*255)},${Math.round(color.b*255)},${isActive ? 1 : 0.3})`;

            const label = new BABYLON.GUI.TextBlock();
            label.text = type;
            label.color = "white";
            label.height = "30px";
            label.width = "320px";
            label.paddingLeft = "20px";
            label.fontSize = 22;
            label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            label.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

            legendItem.addControl(colorBox);
            legendItem.addControl(label);
            scene.xrLegendPanel.addControl(legendItem);

            // XR: Click to filter by subType using existing function
            legendItem.onPointerClickObservable.add(() => {
                filterByType(type);
                // Toggle state and update colorBox opacity
                window.xrLegendActiveTypes[type] = !window.xrLegendActiveTypes[type];
                const active = window.xrLegendActiveTypes[type] !== false;
                colorBox.background = `rgba(${Math.round(color.r*255)},${Math.round(color.g*255)},${Math.round(color.b*255)},${active ? 0.3 : 1})`;
            });
        });
    }

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
    getAllSprites().forEach(sprite => {
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

    const particleNames = getAllSprites()
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

// Fonction pour charger la configuration des images personnalisées
function loadImageConfiguration() {
    try {
        const saved = localStorage.getItem('imageConfiguration');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Erreur lors du chargement de la configuration des images:', e);
    }
    
    // Configuration par défaut si aucune sauvegarde
    return getDefaultImageConfiguration();
}

// Configuration par défaut des images
function getDefaultImageConfiguration() {
    return {
        1: "1blackhole.png",
        2: "2blackhole.png",
        3: "3whitehole.png",
        4: "4nebuleuse.png",
        5: "5etoile.png",
        6: "6etoile.png",
        7: "7neutronstar.png",
        8: "8planet.png",
        9: "9planet.png",
        10: "10protoplanet.png",
        11: "11moon.png",
        12: "12asteroid.png",
        13: "13asteroid.png"
    };
}

// Fonction pour obtenir l'image par défaut pour un niveau
function getDefaultImageForLevel(level) {
    const defaultConfig = getDefaultImageConfiguration();
    return defaultConfig[level] || '5etoile.png';
}

// Fonction pour recharger les données avec la nouvelle configuration d'images
async function reloadWithNewImageConfiguration() {
    // Récupérer les données actuelles
    const currentData = getAllSprites().map(sprite => ({
        prefLabel: sprite.name,
        subType: sprite.metadata.subType,
        x: sprite.originalPosition.x / 20, // Diviser par le ratio utilisé
        y: sprite.originalPosition.y / 20,
        z: sprite.originalPosition.z / 20,
        level: sprite.metadata.level
    }));
    
    if (currentData.length > 0) {
        // Nettoyer la scène actuelle
        clearScene();
        
        // Recharger avec la nouvelle configuration
        await main(currentData, 20);
        
        console.log('Données VR rechargées avec la nouvelle configuration d\'images');
    }
}

// Fonction pour nettoyer la scène
function clearScene() {
    // Supprimer tous les sprites
    if (scene.spriteManagers) {
        scene.spriteManagers.forEach(manager => {
            manager.dispose();
        });
    }
    
    // Vider les tableaux
    labelSprites.length = 0;
    originalPositions.length = 0;
    
    // Supprimer les meshes de texte VR
    scene.meshes.filter(mesh => mesh.name.endsWith('_whoz_mesh')).forEach(mesh => {
        if (mesh.material) {
            if (mesh.material.emissiveTexture) {
                mesh.material.emissiveTexture.dispose();
            }
            mesh.material.dispose();
        }
        scene.removeMesh(mesh);
        mesh.dispose();
    });
}

// Écouter les changements de configuration depuis le sélecteur d'images
window.addEventListener('storage', function(e) {
    if (e.key === 'imageConfiguration' || e.key === 'imageConfigurationUpdate') {
        console.log('Configuration d\'images VR mise à jour, rechargement...');
        setTimeout(async () => {
            await reloadWithNewImageConfiguration();
        }, 100); // Petit délai pour s'assurer que la configuration est bien sauvegardée
    }
});

// Exposer la fonction de rechargement pour le sélecteur d'images
window.reloadWithNewImageConfiguration = reloadWithNewImageConfiguration;

// Test function to verify Meta keyboard functionality
window.testMetaKeyboard = function() {
    console.log("=== TESTING META KEYBOARD FUNCTIONALITY ===");
    
    // Diagnostic information
    console.log("Available functions:");
    console.log("- showVirtualKeyboardGlobal:", typeof showVirtualKeyboardGlobal);
    console.log("- window.showHTMLKeyboard:", typeof window.showHTMLKeyboard);
    console.log("- window.searchPanel:", !!window.searchPanel);
    console.log("- globalXrHelper:", !!globalXrHelper);
    console.log("- globalInputText:", !!globalInputText);
    
    // First ensure search panel is visible
    if (window.searchPanel) {
        if (!window.searchPanel.isVisible) {
            window.searchPanel.isVisible = true;
            console.log("✅ Search panel opened for keyboard test");
        } else {
            console.log("✅ Search panel already visible");
        }
    } else {
        console.error("❌ Search panel not available");
        return;
    }
    
    // Try to show the Meta keyboard with detailed logging
    console.log("🔄 Attempting to show keyboard...");
    if (typeof showVirtualKeyboardGlobal === 'function') {
        showVirtualKeyboardGlobal();
        console.log("✅ Meta keyboard show function called");
    } else {
        console.error("❌ showVirtualKeyboard function not available");
    }
    
    // Force HTML keyboard as backup
    setTimeout(() => {
        if (window.showHTMLKeyboard) {
            console.log("🔄 Forcing HTML keyboard display...");
            window.showHTMLKeyboard();
            console.log("✅ HTML keyboard forced");
        } else {
            console.error("❌ HTML fallback keyboard not available");
        }
    }, 500);
};

// Global keyboard functions (moved outside WebXR callback for proper scope)
let globalXrHelper = null;
let globalInputText = null;

// Function to initialize Meta keyboard availability in VR environment after data load
function initializeMetaKeyboardInVR() {
    console.log("=== INITIALIZING META KEYBOARD AVAILABILITY IN VR ===");
    
    // Wait a bit for VR environment to be fully loaded
    setTimeout(() => {
        try {
            // Ensure search panel is available but keep it hidden
            if (window.searchPanel) {
                // Keep panel hidden but ensure it's ready
                window.searchPanel.isVisible = false;
                console.log("✅ Search panel ready in VR (hidden, available via X button)");
                
                // Ensure global references are properly set
                if (globalXrHelper && globalInputText) {
                    console.log("✅ Meta keyboard system ready in VR environment");
                    console.log("✅ Press X button on left controller to access keyboard");
                } else {
                    console.warn("⚠️ Meta keyboard references not fully initialized");
                    console.log("globalXrHelper:", !!globalXrHelper);
                    console.log("globalInputText:", !!globalInputText);
                }
                
                // Pre-initialize HTML keyboard (but keep it hidden)
                if (window.showHTMLKeyboard && window.hideHTMLKeyboard) {
                    console.log("✅ HTML fallback keyboard system ready");
                } else {
                    console.warn("⚠️ HTML fallback keyboard not available");
                }
                
            } else {
                console.error("❌ Search panel not available for keyboard initialization");
            }
        } catch (error) {
            console.error("❌ Error initializing Meta keyboard availability:", error);
        }
    }, 1000); // Wait 1 second for VR environment to stabilize
}

// Function to show Meta WebXR virtual keyboard (global scope)
function showVirtualKeyboardGlobal() {
    console.log("=== SHOWING VR KEYBOARD BELOW SEARCH PANEL ===");
    console.log("globalXrHelper:", !!globalXrHelper);
    console.log("globalInputText:", !!globalInputText);
    
    // Show VR native keyboard positioned below search panel
    if (window.virtualKeyboard) {
        window.virtualKeyboard.isVisible = true;
        keyboardVisible = true;
        console.log("✅ VR native keyboard shown below search panel");
    }
    
    // Also show HTML fallback for additional compatibility
    if (window.showHTMLKeyboard) {
        window.showHTMLKeyboard();
        console.log("✅ HTML fallback keyboard also available");
    }
    
    // Try Meta native keyboard as enhancement
    if (globalXrHelper && globalXrHelper.baseExperience && globalXrHelper.baseExperience.sessionManager) {
        const session = globalXrHelper.baseExperience.sessionManager.session;
        
        if (session && globalInputText) {
            try {
                console.log("🔄 Attempting Meta Quest native keyboard trigger");
                globalInputText.focus();
                
                // Multiple focus attempts for Meta keyboard
                setTimeout(() => {
                    if (globalInputText && globalInputText.focus) {
                        globalInputText.focus();
                        console.log("🔄 Secondary Meta keyboard focus attempt");
                    }
                }, 100);
                
            } catch (error) {
                console.error("Error with Meta keyboard:", error);
            }
        }
    }
}

// Function to hide Meta WebXR virtual keyboard (global scope)
function hideVirtualKeyboardGlobal() {
    console.log("=== HIDING VR KEYBOARD ===");
    
    try {
        // Hide VR native keyboard
        if (window.virtualKeyboard) {
            window.virtualKeyboard.isVisible = false;
            keyboardVisible = false;
            console.log("✅ VR native keyboard hidden");
        }
        
        // Hide HTML fallback keyboard
        if (window.hideHTMLKeyboard) {
            window.hideHTMLKeyboard();
            console.log("✅ HTML fallback keyboard hidden");
        }
        
        // Blur the input field to hide Meta keyboard
        if (globalInputText) {
            globalInputText.blur();
            console.log("✅ Meta WebXR virtual keyboard hidden");
        }
    } catch (error) {
        console.error("Error hiding keyboards:", error);
    }
}

// Expose keyboard functions globally for debugging
window.showVirtualKeyboard = showVirtualKeyboardGlobal;
window.hideVirtualKeyboard = hideVirtualKeyboardGlobal;
window.initializeMetaKeyboardInVR = initializeMetaKeyboardInVR;

//scene.debugLayer.show()
