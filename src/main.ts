
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSON } from "geojson";
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
const readFromLocalStorage = (goodOrFault = "all") => {
  const geojsonObject = JSON.parse(localStorage.getItem("geojsonObject") || "{}");
  const keys = Object.keys(geojsonObject);

  if (goodOrFault === "good") {
    return keys.filter((key) => geojsonObject[key] === "good");
  }
  if (goodOrFault === "fault") {
    return keys.filter((key) => geojsonObject[key] === "fault");
  }
  return geojsonObject;
};
const filterGeojson = (filterFn: (feature) => boolean) => {
  return geoJson.features.filter(filterFn);
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


// SIDEBAR code
const sidebar = document.getElementById("sidebar");

// SIDEBAR - SAVE FILE BUTTON
const saveFileButton = document.createElement("button");
saveFileButton.id = "btnSaveFile";
saveFileButton.innerText = "💾";
saveFileButton.addEventListener("click", () => {
  const geojsonObject = localStorage.getItem("geojsonObject") || "{}";

  const blob = new Blob([geojsonObject], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = 'geocoderGoedFout.json';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
});

sidebar?.appendChild(saveFileButton);

// SIDEBAR - FILTER
const featuresDiv = document.createElement("div");
featuresDiv.className = "featuresDiv";
featuresDiv.innerHTML = `
<fieldset>
  <legend>Selecteer op map</legend>
  <div class="filter-options">
    <div>
      <input type="radio" id="rbAll" name="rbFilter" value="all" checked />
      <label for="rbAll">Allemaal</label>
    </div>

    <div>
      <input type="radio" id="rbGood" name="rbFilter" value="good" />
      <label for="rbGood">Correct</label>
    </div>

    <div>
      <input type="radio" id="rbFault" name="rbFilter" value="fault" />
      <label for="rbFault">Fout</label>
    </div>
  </div>
</fieldset>
`;

sidebar?.appendChild(featuresDiv);

document.querySelectorAll("input[type=radio]").forEach((radio) => {
  radio.addEventListener("change", (e) => {
    items.innerHTML = "";
    const value = (e.target as HTMLInputElement).value;

    if (value === "all") {
      const filtered = filterGeojson(f => true);

      renderItemsList(filtered);
      map.setFilter("markers", null);
    }
    if (value === "good") {
      const filtered = filterGeojson(f => [...readFromLocalStorage("good")].includes(f.properties.id));

      renderItemsList(filtered);
      map.setFilter("markers", ["in", "id", ...filtered.map(f => f.properties.id)]);
    }
    if (value === "fault") {
      const filtered = filterGeojson(f => [...readFromLocalStorage("fault")].includes(f.properties.id));

      renderItemsList(filtered);
      map.setFilter("markers", ["in", "id", ...filtered.map(f => f.properties.id)]);
    }
  });

});

// SIDEBAR - ITEMS
const items = document.createElement("div");
items.className = "features";
sidebar?.appendChild(items);

const renderItemsList = (filtered) => {
  for (let i = 0; i < filtered.length; i += 1) {
    const feature = filtered[i];

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
      const filtered = filterGeojson(f => f.properties.id === feature.properties.id)
      const bboxCoords = turf.bbox({
        type: "FeatureCollection",
        features: filtered
      });

      map.fitBounds(bboxCoords, { linear: true, maxZoom: 17, maxDuration: 4000 });

      document.querySelector(".featureDiv-active")?.classList.remove("featureDiv-active");
      featureDiv.classList.add("featureDiv-active");
    });

    const goodButton = featureDiv.querySelector("#good");
    const faultButton = featureDiv.querySelector("#fault");

    const geojsonObject = readFromLocalStorage();

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

    items?.appendChild(featureDiv);
  };
}

const init = () => {
  const filtered = filterGeojson(f => true);

  renderItemsList(filtered);
  map.setFilter("markers", null);
};

init();