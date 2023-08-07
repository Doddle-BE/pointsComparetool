import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// import geoJson from "./geojson.json";
import data from "./aalst_naPascalTwo.json";
import "./style.css";
import bbox from "@turf/bbox";

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
  return data.features.filter(filterFn);
};
const setSearchParams = ({ key, value }: { key: string; value: string }) => {
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set(key, value);
  window.history.replaceState({}, "", `${location.pathname}?${searchParams}`);
}
const getSearchParams = (key: string) => {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(key);
}

// SLIDER
const slider = document.getElementById('slider');
const sliderValue = document.getElementById('slider-value');

// MAP code
const map = new maplibregl.Map({
  container: "map",
  style:
    "https://api.maptiler.com/maps/streets-v2/style.json?key=62WXuWfw6hVYJxeAHjwS",
  center: [3.4472, 50.994],
  zoom: 9,
  hash: true
});

map.on("load", () => {
  map.addSource('wmts-source', {
    'type': 'raster',
    'tiles': [
      'https://geo.api.vlaanderen.be/GRB/wmts/1.0.0/grb_bsk/default/GoogleMapsVL/{z}/{y}/{x}.png'
    ],
    'tileSize': 256
  });

  map.addLayer({
    'id': 'wmts-layer',
    'type': 'raster',
    'source': 'wmts-source',
    'layout': {},
    'paint': {
    }
  });

  map.addSource("geojson", {
    type: "geojson",
    data: data
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

    const geometry = e?.features?.[0].geometry;

    if (geometry?.type === "Point") {
      const coordinates = geometry?.coordinates?.slice() as [number, number];
      const description = `
      ${e?.features?.[0].properties.poi ? "<h4><span>📍&nbsp;</span>" + e?.features?.[0].properties.poi + "</h4>" : ""}
      <p>${e?.features?.[0].properties.street} ${e?.features?.[0].properties.houseNumber ? e?.features?.[0].properties.houseNumber : ""}<br />
      ${e?.features?.[0].properties.postalCode ? e?.features?.[0].properties.postalCode : ""} ${e?.features?.[0].properties.community ? e?.features?.[0].properties.community : ""}</p>
      ${e?.features?.[0].properties.intersection ? "<p>⏧: " + e?.features?.[0].properties.intersection + "</p>" : ""}
      `
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }
      popup.setLngLat(coordinates).setHTML(description).addTo(map);
    }
  });

  map.on('mouseleave', 'markers', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });

  slider?.addEventListener('input', (e) => {
    map.setPaintProperty(
      'wmts-layer',
      'raster-opacity',
      parseInt(e?.target?.value, 10) / 100
    );

    sliderValue.textContent = e?.target?.value + '%';
  });
});


// SIDEBAR code
const sidebar = document.getElementById("sidebar");

// SIDEBAR - SAVE FILE BUTTON
const saveFileButton = document.createElement("button");
saveFileButton.id = "btnSaveFile";
saveFileButton.innerText = "💾";
saveFileButton.addEventListener("click", () => {
  const geojsonObjectString = localStorage.getItem("geojsonObject") || "{}";
  const geojsonObject = JSON.parse(geojsonObjectString);

  const geojsonObjectArray = Object.keys(geojsonObject).map((key) => {
    return {
      id: key,
      value: geojsonObject[key]
    }
  });

  const geoFeatures = data.features.map((feature) => {
    const foundItem = geojsonObjectArray.find((item) => item.id === feature.properties.id);
    if (foundItem) {
      feature.properties = {
        ...feature.properties,
        correct: foundItem.value === "good"
      }
    }
    return feature;
  });
  const filter = getSearchParams("filter");
  const geoFeaturesWithGoodFaultFilter = filter === "all" ? geoFeatures : geoFeatures.filter((feature) => feature.properties.correct === (filter === "good"));

  const geoJsonWithGoedFout = {
    ...data,
    features: geoFeaturesWithGoodFaultFilter
  };

  const blob = new Blob([JSON.stringify(geoJsonWithGoedFout)], { type: "application/json" });
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
      const filtered = filterGeojson(_ => true);

      renderItemsList(filtered);
      map.setFilter("markers", null);

      setSearchParams({ key: "filter", value: "all" });
    }
    if (value === "good") {
      const filtered = filterGeojson(f => [...readFromLocalStorage("good")].includes(f.properties.id));

      renderItemsList(filtered);
      map.setFilter("markers", ["in", "id", ...filtered.map(f => f.properties.id)]);

      setSearchParams({ key: "filter", value: "good" });
    }
    if (value === "fault") {
      const filtered = filterGeojson(f => [...readFromLocalStorage("fault")].includes(f.properties.id));

      renderItemsList(filtered);
      map.setFilter("markers", ["in", "id", ...filtered.map(f => f.properties.id)]);

      setSearchParams({ key: "filter", value: "fault" });
    }
  });

});

// SIDEBAR - ITEMS
const items = document.createElement("div");
items.className = "features";
sidebar?.appendChild(items);

const renderItemsList = (filtered) => {
  for (let i = 0; i < filtered.length; i += 2) {
    const feature = filtered[i];

    const featureDiv = document.createElement("div");
    featureDiv.dataset.id = feature.properties.id;
    featureDiv.innerHTML = `
      <div>
        <h4>${feature.properties.street} ${feature.properties.houseNumber ? feature.properties.houseNumber : ""}</h4>
        <h4>${feature.properties.postalCode ? feature.properties.postalCode : ""} ${feature.properties.community ? feature.properties.community : ""}</h4>
        ${feature.properties.intersection ? "<h4><span id='intersection'>⏧&nbsp;</span>" + feature.properties.intersection + "</h4>" : ""}
        ${feature.properties.metaData.peliasUrl ? "<a href='https://pelias.github.io/compare/#" + feature.properties.metaData.peliasUrl.match(/\/v1.*/) + "' target='_blank'>Pelias</a>" : ""}
        <div class="remark">
          <label>Opmerking:</label>
          <input type="text" id="remarkInput" data-featureid=${feature.properties.id}>
        </div>
      </div>
      <div id="goodOrFault">
        <button id="good">✅</button>
        <button id="fault">❌</button>
      </div>
      `;
    featureDiv.className = "featureDiv";

    featureDiv.addEventListener("click", async () => {
      map.setFilter("markers", ["==", "id", feature.properties.id]);
      const filtered = filterGeojson(f => f.properties.id === feature.properties.id)
      const bboxCoords = bbox({
        type: "FeatureCollection",
        features: filtered
      });

      map.fitBounds(bboxCoords, { linear: true, maxZoom: 17, maxDuration: 4000 });

      document.querySelector(".featureDiv-active")?.classList.remove("featureDiv-active");
      featureDiv.classList.add("featureDiv-active");

      // log features to console
      console.log("NEW Result (Red on map): ", filtered?.[0]);
      console.log("OLD Result (Green on map): ", filtered?.[1]);
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


    featureDiv?.querySelector("#remarkInput")?.addEventListener("click", openModal);

    items?.appendChild(featureDiv);
  };
}

// MODAL code

// Get the modal
let modal = document.getElementById("myModal");
// Get the <span> element that closes the modal
let span = document.getElementsByClassName("close")[0];
// Open the modal
function openModal(e) {
  e.stopPropagation();
  document.getElementById("modalOpenFeatureId").value = e.target.dataset.featureid;
  modal && (modal.style.display = "block");
}
// Close the modal
document.getElementById("modalClose").onclick = function () {
  modal && (modal.style.display = "none");
}
// Close the modal if you click outside of it
window.onclick = function (event) {
  if (event.target == modal) {
    modal && (modal.style.display = "none");
  }
}
// Set value from modal to the input
document.getElementById("modalSaveBtn").onclick =
  function setValue() {
    document.querySelector(`[data-featureid="${document.getElementById("modalOpenFeatureId").value}"]`).value = document.getElementById("modalInput").value;
    modal && (modal.style.display = "none");
  }

const init = () => {
  setSearchParams({ key: "filter", value: "all" });

  const filtered = filterGeojson(_ => true);
  renderItemsList(filtered);
};

init();