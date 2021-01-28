require([
  "esri/portal/Portal",
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
  "esri/portal/PortalQueryParams",
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/layers/FeatureLayer",
  "esri/smartMapping/renderers/color",
  "esri/smartMapping/symbology/color",
  // "esri/smartMapping/symbology/color/ColorScheme",
  "esri/smartMapping/statistics/histogram",
  "esri/widgets/smartMapping/ColorSlider",
  "esri/widgets/Legend",
  "esri/core/watchUtils"
], function (Portal, OAuthInfo, esriId, PortalQueryParams, Map, MapView, GeoJSONLayer, FeatureLayer, colorRendererCreator, colorSchemes, histogram, ColorSlider, Legend, watchUtils) {

  // AUTHENTICATION
  var personalPanelElement = document.getElementById(
    "personalizedPanel");
  var anonPanelElement = document.getElementById("anonymousPanel");
  var userIdElement = document.getElementById("userId");

  var info = new OAuthInfo({
    // Swap this ID out with registered application ID
    appId: "VchNV5mIbOBwksHv",
    // Uncomment the next line and update if using your own portal
    portalUrl: "https://ral.maps.arcgis.com",
    // Uncomment the next line to prevent the user's signed in state from being shared with other apps on the same domain with the same authNamespace value.
    // authNamespace: "portal_oauth_inline",
    popup: false
  });
  esriId.registerOAuthInfos([info]);

  esriId.checkSignInStatus(info.portalUrl + "/sharing")
    .then(
      function () {
        drawMap();
      }
    ).catch(
      function (err) {
        // Anonymous view
        console.log(err)
        anonPanelElement.style.display = "block";
        personalPanelElement.style.display = "none";
      }
    );

  document.getElementById("sign-in").addEventListener("click", function () {
    // user will be redirected to OAuth Sign In page
    esriId.getCredential(info.portalUrl + "/sharing");
    console.log('clicked!')
  });

  document.getElementById("sign-out").addEventListener("click",
    function () {
      esriId.destroyCredentials();
      window.location.reload();
    });

  // MAP
  function drawMap() {

    // UI Handlers
    const supervisorObjectArray = [{
        "name": "adventure",
        "alias": "Adventure"
      },
      {
        "name": "anniewilkerson",
        "alias": "Annie Wilkerson"
      },
      {
        "name": "durantnature",
        "alias": "Durant Nature"
      },
      {
        "name": "forestridgepark",
        "alias": "Forest Ridge"
      },
      {
        "name": "lakejohnson",
        "alias": "Lake Johnson"
      },
      {
        "name": "lakewheeler",
        "alias": "Lake Wheeler"
      },
      {
        "name": "mooresquare",
        "alias": "Moore Square"
      },
      {
        "name": "mordecai",
        "alias": "Mordecai"
      },
      {
        "name": "nature",
        "alias": "Nature"
      },
      {
        "name": "outdoorrec",
        "alias": "Outdoor Recreation Programs"
      },
      {
        "name": "pullenam",
        "alias": "Pullen Amusements"
      },
      {
        "name": "pullenac",
        "alias": "Pullen Arts Center"
      },
      {
        "name": "rcm",
        "alias": "Raleigh City Museum"
      },
      {
        "name": "sertomaarts",
        "alias": "Sertoma Arts"
      },
      {
        "name": "wcw",
        "alias": "Walnut Creek Wetland"
      },
      {
        "name": "woodlandcenter",
        "alias": "Woodland Center"
      }
    ]
    const ageObjectArray = [{
        "name": "p",
        "alias": "Pre-School"
      },
      {
        "name": "y",
        "alias": "Youth"
      },
      {
        "name": "t",
        "alias": "Teen"
      },
      {
        "name": "a",
        "alias": "Adult"
      },
      {
        "name": "s",
        "alias": "Senior"
      },
    ]

    const supervisorCheckboxEl = document.getElementById("supervisor-checkbox-list")
    const ageCheckboxEl = document.getElementById("age-checkbox-list")

    generateVariableCheckboxes(supervisorObjectArray, supervisorCheckboxEl, "supervisor")
    generateVariableCheckboxes(ageObjectArray, ageCheckboxEl, "age")

    function generateVariableCheckboxes(variableObjectArray, checklistContainerEl, checkListName){
      variableObjectArray.forEach(s => {
        let input = document.createElement("input")
        input.setAttribute("type", "checkbox")
        input.setAttribute("id", s.name)
        input.setAttribute("name", checkListName)
        input.setAttribute("value", s.name)
        input.checked = true
        checklistContainerEl.appendChild(input)

        let label = document.createElement("label")
        label.setAttribute("for", s.name)
        label.innerText = s.alias
        checklistContainerEl.appendChild(label)

        let br = document.createElement("br")
        checklistContainerEl.appendChild(br)
      
      })
    }


    ['supervisor', 'age'].forEach(x => {
      let selectAllBtn = document.getElementById(`${x}-select-all`)
      selectAllBtn.addEventListener('click', () => {
        toggleAll(x)
      })

      let clearAllBtn = document.getElementById(`${x}-clear-all`)
      clearAllBtn.addEventListener('click', () => {
        toggleAll(x, false)
      })
    })

    function toggleAll(name, toggle = true) {
      let checkboxes = document.getElementsByName(name)
      checkboxes.forEach(checkbox => {
        checkbox.checked = toggle
      })
    }

    const updateMapBtn = document.getElementById('update-map')
    updateMapBtn.addEventListener('click', () => {
      let ageArray = getCheckedValues('age')
      let supervisorArray = getCheckedValues('supervisor')

      if (ageArray.length > 0 && supervisorArray.length > 0) {
        let valueExpression = generateArcadeExpression(ageArray, supervisorArray)
        generateRenderer(regLayer, map, view, "high-to-low", valueExpression)
      } else {
        alert("You must have at least one value for both Supervisor and Age")
      }

    })

    function generateArcadeExpression(ageArray, supervisorArray) {
      
      let ageSupervisorArray = []
      ageArray.forEach(age => {
        let ageSupervisorCombos = supervisorArray.map(supervisor => `${age}_${supervisor}_count`)
        ageSupervisorArray.push(ageSupervisorCombos)
      })

      let expressionString = ''
      ageSupervisorArray.flat().forEach(ageSupervisorCombo => {
        expressionString += `$feature.${ageSupervisorCombo}+`
      })

      let expression = `${expressionString.slice(0, -1)} / ($feature.households_esri_2020 / 100)`
      return expression
    }

    function getCheckedValues(name) {
      let checkedValuesArray = []
      checkboxes = document.getElementsByName(name)
      for (checkbox of checkboxes) {
        if (checkbox.checked) {
          checkedValuesArray.push(checkbox.value)
        }
      }

      return checkedValuesArray
    }


    const map = new Map({
      basemap: "gray-vector"
    });
    const view = new MapView({
      container: "viewDiv",
      map: map
    });

    // const initialRender;
    let regFieldInfos = {}
    const regLayer = new FeatureLayer({
      portalItem: {
        id: '264190b18b3746a7a0f6df5d9fac98fe'
      },
      outFields: ["*"]
    })

    map.add(regLayer)

    // // Initial Rendeer
    let valueExpression = "$feature.p_count + $feature.y_count + $feature.t_count + $feature.a_count + $feature.s_count / ($feature.households_esri_2020 / 100)"
    let legend;
    view.whenLayerView(regLayer)
        .then(layerView => {
            return watchUtils.whenFalseOnce(layerView, "updating", generateRenderer(regLayer, map, view, "high-to-low", valueExpression))
        })
        .then(() => {
            legend = new Legend({
                view: view,
                container: "containerDiv",
                layerInfos: [
                    {
                        layer: regLayer,
                        title: "Registrations per 100 Households by Selected Age Group(s) and Supervisor(s)"
                    }
                ]
            })
        })
        .then(() => regLayer.queryExtent())
        .then(response => view.goTo(response.extent))

    function generateRenderer(layer, map, view, theme, valueExpression) {
      
      const colorRamp = [ "#e6e4e1", "#d9d7d6", "#a3af96", "#7c9e14", "#4e6605" ];
      const colorParams = {
            layer: layer,
            view: view,
            // theme: theme,
            colorScheme: {
              id: "custom-scheme",
              colors: colorRamp,
              noDataColor: "#e6e4e1",
              colorsForClassBreaks: [
                {
                  colors: colorRamp,
                  numClasses: 5
                }
              ],
              outline: {
                color: "#f7f7f7",
                width: "0.1px"
              },
              opacity: 1
            },
            valueExpression: valueExpression
        }

        let rendererResult;
        colorRendererCreator
            .createContinuousRenderer(colorParams)
            .then(response => {
                rendererResult = response
                layer.renderer = rendererResult.renderer

                if (!map.layers.includes(layer)){
                    map.add(layer)
                }

                // return histogram({
                //     layer: layer,
                //     valueExpression: colorParams.valueExpression,
                //     view: view,
                //     numBins:10
                // })
            })
            .catch(function (error) {
              console.log("there was an error: ", error);
            });

    }
  }
});