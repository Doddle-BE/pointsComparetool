import "./style.css";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import geoJson from "./geojson.json";
import bbox from "@turf/bbox";
import center from "@turf/center";

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

const sidebar = document.getElementById("sidebar");

for (let i = 0; i < geoJson.features.length; i += 2) {
  const feature = geoJson.features[i];

  const featureDiv = document.createElement("div");
  featureDiv.innerHTML = `
    <h4>${feature.properties.street} ${feature.properties.houseNumber ? feature.properties.houseNumber : ""}</></h4>
    <h4>${feature.properties.postalCode ? feature.properties.postalCode : ""} ${feature.properties.community ? feature.properties.community : ""}</></h4>
    `;
  featureDiv.className = "featureDiv";

  featureDiv.addEventListener("click", () => {
    map.setFilter("markers", ["==", "id", feature.properties.id]);
    const filtered = geoJson.features.filter(f => f.properties.id === feature.properties.id);
    const bboxCoords = bbox({
      type: "FeatureCollection",
      features: filtered
    });

    map.fitBounds(bboxCoords, { maxZoom: 18, maxDuration: 4000 });
  });
  sidebar?.appendChild(featureDiv);
};