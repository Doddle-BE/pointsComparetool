
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import geoJson from "./geojson.json";
import "./style.css";
import * as turf from '@turf/turf';

// HELPER FUNCTIONS
const makeActive = (button: Element) => {
  button.classList.remove("buttonInactive");
  button.classList.add("buttonActive");
};
const makeInactive = (button: Element) => {
  button.classList.remove("buttonActive");
  button.classList.add("buttonInactive");
};
const writeToLocalStorage = (id: string, value: string) => {
  const geojsonObject = JSON.parse(localStorage.getItem("geojsonObject") || "{}");
  geojsonObject[id] = value;
  localStorage.setItem("geojsonObject", JSON.stringify(geojsonObject));
};

// MAP code
const map = new maplibregl.Map({
  container: "map",
  style:
    "https://tileserver.develop.platform.orbitgis.com/styles/osm/style.json",
  center: [3.4472, 50.994],
  zoom: 9,
  hash: true
});

map.on("load", () => {
  map.addSource("geojson", {
    type: "geojson",
    data: geoJson
  });

  map.addLayer({
    id: "markers",
    type: "circle",
    source: "geojson",
    paint: {
      "circle-radius": 10,
      "circle-color": ["get", "marker-color"]
    }
  });

  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  map.on('mouseenter', 'markers', (e) => {
    map.getCanvas().style.cursor = 'pointer';

    const coordinates = e?.features?.[0].geometry?.coordinates?.slice();
    const description = `
    <p>${e?.features?.[0].properties.street} ${e?.features?.[0].properties.houseNumber ? e?.features?.[0].properties.houseNumber : ""}</p>
    <p>${e?.features?.[0].properties.postalCode ? e?.features?.[0].properties.postalCode : ""} ${e?.features?.[0].properties.community ? e?.features?.[0].properties.community : ""}</p>
    `

    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    popup.setLngLat(coordinates).setHTML(description).addTo(map);
  });

  map.on('mouseleave', 'markers', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
});


//SIDEBAR code
const sidebar = document.getElementById("sidebar");

const featuresDiv = document.createElement("div");
featuresDiv.className = "featuresDiv";
featuresDiv.innerHTML = `
<fieldset>
  <legend>Selecteer op map</legend>
  <div class="filter-options">
    <div>
      <input type="radio" id="huey" name="drone" value="huey" />
      <label for="huey">Allemaal</label>
    </div>

    <div>
      <input type="radio" id="dewey" name="drone" value="dewey" />
      <label for="dewey">Correct</label>
    </div>

    <div>
      <input type="radio" id="louie" name="drone" value="louie" />
      <label for="louie">Fout</label>
    </div>
  </div>
</fieldset>
`;

sidebar?.appendChild(featuresDiv);

for (let i = 0; i < geoJson.features.length; i += 2) {
  const feature = geoJson.features[i];

  const featureDiv = document.createElement("div");
  featureDiv.dataset.id = feature.properties.id;
  featureDiv.innerHTML = `
    <div>
      <h4>${feature.properties.street} ${feature.properties.houseNumber ? feature.properties.houseNumber : ""}</h4>
      <h4>${feature.properties.postalCode ? feature.properties.postalCode : ""} ${feature.properties.community ? feature.properties.community : ""}</h4>
    </div>
    <div id="goodOrFault">
      <button id="good">✅</button>
      <button id="fault">❌</button>
    </div>
    `;
  featureDiv.className = "featureDiv";

  featureDiv.addEventListener("click", () => {
    map.setFilter("markers", ["==", "id", feature.properties.id]);
    const filtered = geoJson.features.filter(f => f.properties.id === feature.properties.id);
    const bboxCoords = turf.bbox({
      type: "FeatureCollection",
      features: filtered
    });

    map.fitBounds(bboxCoords, { linear: true, maxZoom: 17, maxDuration: 4000 });
  });

  const goodButton = featureDiv.querySelector("#good");
  const faultButton = featureDiv.querySelector("#fault");

  const geojsonObject = JSON.parse(localStorage.getItem("geojsonObject") || "{}");
  console.log('\x1b[31m%s\x1b[0m', 'geojsonObject', geojsonObject);


  if (geojsonObject[feature.properties.id] === "good") {
    goodButton && makeActive(goodButton);
  } else if (geojsonObject[feature.properties.id] === "fault") {
    faultButton && makeActive(faultButton);
  }

  goodButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    makeActive(goodButton);
    faultButton && makeInactive(faultButton);
    writeToLocalStorage(feature.properties.id, "good")
  });

  faultButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    makeActive(faultButton);
    goodButton && makeInactive(goodButton);
    writeToLocalStorage(feature.properties.id, "fault")
  });

  sidebar?.appendChild(featureDiv);
};