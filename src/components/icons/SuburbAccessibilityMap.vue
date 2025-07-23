<!-- src/components/insights/SuburbAccessibilityMap.vue -->
<script setup>
import * as d3 from 'd3';
import { ref, onMounted } from 'vue';

const mapRef = ref(null);
const scores = ref({});

onMounted(async () => {
  const geojson = await d3.json('/data/melbourne_suburbs.geojson');
  const scoreData = await d3.json('/data/suburb_accessibility_scores.json');

  // Convert array to object { suburbName: score }
  scores.value = Object.fromEntries(scoreData.map(d => [d.Suburb, d.score]));
  drawMap(geojson, scores.value);
});

function drawMap(geojson, scoreData) {
  const container = mapRef.value;
  const width = container.offsetWidth;
  const height = 500;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const projection = d3.geoMercator()
    .fitSize([width, height], geojson);

  const path = d3.geoPath().projection(projection);
  const color = d3.scaleSequential()
    .domain([0.4, 0.9])  // Adjust to your score range
    .interpolator(d3.interpolateYlGnBu);

  svg.selectAll('path')
    .data(geojson.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('fill', d => color(scoreData[d.properties.feature_name] || 0.4))
    .attr('stroke', '#444')
    .attr('stroke-width', 1)
    .on('mouseover', function (event, d) {
      d3.select(this).attr('fill', '#FFD54F');
    })
    .on('mouseout', function (event, d) {
      d3.select(this).attr('fill', color(scoreData[d.properties.feature_name] || 0.4));
    })
    .on('click', (event, d) => {
      const name = d.properties.feature_name;
      alert(`${name}\nScore: ${scoreData[name] || 'N/A'}`);
    });
}
</script>

<template>
  <div class="map-container" ref="mapRef">
    <!-- Map will render here -->
  </div>
</template>

<style scoped>
.map-container {
  width: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
}
</style>
