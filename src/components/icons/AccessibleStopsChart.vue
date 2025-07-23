<script setup>
import { ref, onMounted } from 'vue';
import * as d3 from 'd3';
import Papa from 'papaparse';

const suburbData = ref([]);
const containerRef = ref(null);

onMounted(() => {
  Papa.parse('/vic_wheelchair_tram_stops.csv', {
    header: true,
    download: true,
    complete: (results) => {
      const suburbCounts = {};
      results.data.forEach(row => {
        const match = row.formatted_address?.match(/,\s*([^,]+?\sVIC\s\d{4})/i);
        if (match && match[1]) {
          const suburb = match[1].trim();
          suburbCounts[suburb] = (suburbCounts[suburb] || 0) + 1;
        }
      });

      const data = Object.entries(suburbCounts).map(([name, value]) => ({ name, value }));
      suburbData.value = data;
      drawPackedBubbles(data);
    }
  });
});

function drawPackedBubbles(data) {
  const container = containerRef.value;
  const width = container.clientWidth || 700;
  const height = width;

  const root = d3.hierarchy({ children: data }).sum(d => d.value);
  const pack = d3.pack().size([width, height]).padding(5);
  const nodes = pack(root).leaves();

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const node = svg.selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('mouseover', function (event, d) {
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', d.r + 5)
        .attr('fill', '#d5a0e6');
    })
    .on('mouseout', function (event, d) {
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', d.r)
        .attr('fill', '#e7c9f4');
    });

  node.append('circle')
    .attr('r', d => d.r)
    .attr('fill', '#e7c9f4')
    .attr('stroke', '#7d2494')
    .attr('stroke-width', 2);

  node.append('title')
    .text(d => `${d.data.name}: ${d.data.value} stops`);

  node.append('text')
    .attr('dy', '-0.2em')
    .style('text-anchor', 'middle')
    .style('pointer-events', 'none')
    .style('font-size', d => Math.min(14, d.r / 4) + 'px')
    .style('fill', '#7d2494')
    .text(d => d.data.name.split(' VIC')[0]);

  node.append('text')
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .style('pointer-events', 'none')
    .style('font-size', d => Math.min(14, d.r / 4) + 'px')
    .style('fill', '#7d2494')
    .text(d => `${d.data.value}`);
}
</script>

<template>
  <div class="bubble-pack-container">
    <div class="chart-area" ref="containerRef"></div>
    <div class="desc-section">
      <h2 class="title">Explore Melbourne Accessibly</h2>
      <p class="insight">
        This visualization highlights Melbourne's progress toward inclusivity. Each bubble represents a suburb, sized by the number of wheelchair-accessible tram stops. Larger bubbles mean better access, helping people in wheelchairs explore the city with ease. It supports inclusive planning and showcases Melbourne's growth as an accessible city for all.
      </p>
    </div>
  </div>
</template>

<style scoped>
.bubble-pack-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  padding: 3rem 2rem;
  background-color: #fff;
}

.chart-area {
  flex: 1 1 100%;
  max-width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
}

.desc-section {
  flex: 1 1 100%;
  max-width: 100%;
  padding-left: 0;
}

@media screen and (min-width: 900px) {
  .chart-area {
    flex: 1 1 60%;
  }
  .desc-section {
    flex: 1 1 35%;
    padding-left: 2rem;
  }
}

.title {
  font-size: 2rem;
  font-weight: bold;
  color: #7d2494;
  margin-bottom: 1.2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: center; /* Add this line */
}


.insight {
  font-size: 1.1rem;
  line-height: 1.7;
  color: #333;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: justify;
  margin-top: 1rem;
  word-break: normal;
  overflow-wrap: break-word;
  hyphens: none;
  padding: 0 1rem;
}

</style>
