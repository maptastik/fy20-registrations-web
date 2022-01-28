require([
  "esri/portal/Portal",
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
  "esri/portal/PortalQueryParams",
  "esri/Map",
  "esri/Basemap",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/VectorTileLayer",
  "esri/smartMapping/renderers/color",
  "esri/smartMapping/symbology/color",
  // "esri/smartMapping/symbology/color/ColorScheme",
  "esri/smartMapping/statistics/histogram",
  "esri/widgets/smartMapping/ColorSlider",
  "esri/widgets/BasemapGallery",
  "esri/widgets/Compass",
  "esri/widgets/Legend",
  "esri/widgets/LayerList",
  "esri/widgets/Expand",
  "esri/core/watchUtils"
], function (Portal,
             OAuthInfo,
             esriId,
             PortalQueryParams,
             Map,
             Basemap,
             MapView,
             FeatureLayer,
             VectorTileLayer,
             colorRendererCreator,
             colorSchemes,
             histogram,
             ColorSlider,
             BasemapGallery,
             Compass,
             Legend,
             LayerList,
             Expand,
             watchUtils) {

  /* ####################
     ## AUTHENTICATION ##
     #################### */

  var personalPanelElement = document.getElementById(
    "personalizedPanel");
  var anonPanelElement = document.getElementById("anonymousPanel");
  var userIdElement = document.getElementById("userId");

  var info = new OAuthInfo({
    // appId from https://ral.maps.arcgis.com/home/item.html?id=45cdf5dbcde94d5d88df9fb0b4cb3c5a
    appId: "yv1LycMxJxJCK2kR",
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

  /* ######### 
     ## MAP ##
     ######### */

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
      basemap: "arcgis-light-gray"
    });
    const view = new MapView({
      container: "viewDiv",
      map: map,
      constraints: {
        minZoom: 9,
        maxZoom: 12
      }
    });
    const compass = new Compass({
      view: view
    });
    view.ui.add(compass, "top-left");

    // LAYERS

    // Registrations
    const regLayer = new FeatureLayer({
      portalItem: {
        id: '264190b18b3746a7a0f6df5d9fac98fe'
      },
      outFields: ["*"],
      title: "FY20 Registrations by Census Block Group",
    })
    map.add(regLayer);

    // Block Group Outline Layer
    const bgOutlineLayer = new FeatureLayer({
      url: "https://services1.arcgis.com/a7CWfuGP5ZnLYE7I/arcgis/rest/services/CensusBlockGroups2010/FeatureServer/0",
      outFields: "GEOID10",
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-line",
            color: "#323232",
            width: 0.25,

        }
      },
      title: "Census Block Group Outlines",
      labelsVisible: false,
      visible: false
    })
    map.add(bgOutlineLayer)

    // Low-Moderate Income       
    const lowIncomeLayer = new FeatureLayer({
      portalItem: {
        id: "a5138e08e6964a1bb0d4fa83ade7fb67"
      },
      outFields: ["geoid10", "ral_bg", "households_acshhbpov_p"],
      popupEnables: false,
      definitionExpression: "households_acshhbpov_p >= 20",
      title: "Low Income Block Groups (2014-2018)",
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-marker",
          style: "square",
          color: "#78909C",
          outline: {
            color: "black",
            width: 0.5
          },
          size: 5,
          xoffset: -3,
        }
      },
      visible: true,
      minScale: 300000
    })
    map.add(lowIncomeLayer);

    // High Vulnerability 
    const svLayer = new FeatureLayer({
      url: "https://maps.wakegov.com/arcgis/rest/services/Social_Equity/Vulnerability_Assessment_Index_Series_2018/MapServer/0",
      definitionExpression: "TOTAL_SCORE > 340",
      title: "Highest Vulnerability Wake County Census Block Groups (2014-2018)",
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
          style: "square",
          color: "#FFCC80",
          outline: {
            color: "black",
            width: 0.5
          },
          size: 5,
          xoffset: 3,
        }
      },
      visible: true,
      minScale: 300000
    })
    map.add(svLayer)

    // Reference Layer
    const referenceLayer = new VectorTileLayer({
      url: "https://ral.maps.arcgis.com/sharing/rest/content/items/30d6b8271e1849cd9c3042060001f425/resources/styles/root.json?f=pjson",
      title: "Roads/Places Reference",
      visible: false
    })
    map.add(referenceLayer)

    // Expandable Layer List
    const layerList = new LayerList({
      view: view,
      container: document.createElement("div")
    })

    const llExpand = new Expand({
      view: view,
      content: layerList,
      group: "top-right",
      expandTooltip: "Expand: Toggle Layers",
      expanded: true
    })
    view.ui.add(llExpand, "top-right")

    // Expandable Basemap Gallery
    const basemapGallery = new BasemapGallery({
      view: view,
      container: document.createElement("div")
    })
    console.log(basemapGallery)
    const basemapExpand = new Expand({
      view: view,
      content: basemapGallery,
      group: "top-right",
      expandTooltip: "Expand: Change Basemap"
    })
    view.ui.add(basemapExpand, "top-right")

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
                    layer: svLayer
                  },
                  {
                    layer: lowIncomeLayer
                  },
                    {
                        layer: regLayer,
                        title: "Registrations per 100 Households by Selected Age Group(s) and Supervisor(s)"
                    },
                ]
            })
        })
        .then(() => regLayer.queryExtent())
        .then(response => view.goTo(response.extent))

    function generateRenderer(layer, map, view, theme, valueExpression) {
      
      const colorRamp = [ "#e6e4e1", "#d9d7d6", "#a3af96", "#7c9e14", "#4e6605" ];
      // const colorRamp = ['#ffffcc','#c2e699','#78c679','#31a354','#006837']
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
                width: "0"
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