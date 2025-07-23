<template>
  <div class="main-container">

<video autoplay muted loop playsinline poster="./image/crowd.png">
  <source src="./video/Crowd2.mp4" type="video/mp4" />
</video>
<!-- <div class="overlay"></div> -->


<!-- <div class="introduceContainer ">

  <h1>Where are you planning to go?</h1>
  <h3>We will check live footpath crowd data of the streets.</h3>

  <div class="buttonBottonLine ">

  </div>
</div> -->

<div class="sensor-page-wrapper">
  <!-- <div class="header-icon">
    <span class="wheelchair-icon">♿</span>
    <h2>Where are you planning to go?</h2>
  </div>
  <p class="subtitle">We'll check live footpath crowd data for that place.</p> -->

  <div class="locationContainer">

<div class="autocomplete-wrapper wow animate__animated animate__fadeInLeft">
<h5 class="section-title">Wondering how busy it is in Melbourne City? Just type a street, station, or shopping centre — we’ll show real-time crowd levels from live sensors.</h5>

  <div class="input-with-reset">
    <input
      v-model="userInput"
      placeholder="e.g. Melbourne Central, Flagstaff station."
      @input="filterSuggestions"
      @focus="suggestionsVisible = true"
      @blur="hideSuggestionsLater"

      class="input-box"
    />
    <button v-if="userInput" class="reset-btn" @click="resetAll">✖</button>

<ul
  v-if="suggestionsVisible && filteredSuggestions.length"
  class="suggestions"
>
  <li
    v-for="(suggestion, index) in filteredSuggestions"
    :key="index"
    @mousedown.prevent="selectSuggestion(suggestion)"
  >
    {{ suggestion.sensor_description }}
  </li>
</ul>

  </div>

<button @click="checkCrowdForPlace" class="check-btn">
Check Crowd Level </button>


  <!-- ✅ Embed result here -->

  <div v-if="feedback" class="feedback-container">
    <template v-if="feedbackClass !== 'error'">
      <div class="live-status">
        <span class="live-dot"></span>
        <span class="live-status-text">
          <strong style="color:#1e3a8a;">Live:</strong>
          <strong :class="liveStatusClass">&nbsp;{{ liveStatusText }}</strong>
        </span>
      </div>

  <div class="gauge-wrapper">
    <span class="gauge-label left">Low</span>
    <canvas ref="gaugeChart" width="220" height="140" class="gauge-style"></canvas>
    <span class="gauge-label right">High</span>
  </div>
</template>

<div class="feedback-text" v-html="feedback"></div>

  </div>

<!-- 🌤️ Forecast Toggle -->

<p v-if="feedback && feedbackClass !== 'error'" class="toggle-link">
  <strong>
    📅 Planning to head out later?
    <span class="underline-only" @click="onForecastToggle"> Click here to check forecast</span>
  </strong>
</p>

</div>

<!-- <div
ref="resultSection"
  class="wow animate__animated animate__fadeInRight"
  v-if="feedback"
  :class="['result-box', 'always-default-box']"
>

  <template v-if="feedbackClass !== 'error'">
    <div class="live-status">
      <span class="live-dot"></span>
      <span class="live-status-text">
        <strong style="color:#1e3a8a;">Live:</strong>
        <strong :class="liveStatusClass">&nbsp;{{ liveStatusText }}</strong>
      </span>
    </div>

    <div class="gauge-wrapper">
      <span class="gauge-label left">Low</span>
      <canvas ref="gaugeChart" width="220" height="140" class="gauge-style"></canvas>
      <span class="gauge-label right">High</span>
    </div>
  </template>

  <div class="feedback-text" v-html="feedback"></div>
</div> -->

  </div>

  <!-- Forecast Card Box -->
<div
  v-show="showForecast"
  ref="forecastSection"
  class="forecast-section wow animate__animated animate__fadeInLeft"
>
  <h3 class="section-title">Forecast for Next Hours</h3>

  <!-- ⏳ Show loading inside the card -->
<div v-if="isLoadingForecast" class="loading-spinner">
  <div class="lds-dual-ring"></div>
  <p>Loading forecast...</p>
</div>


  <!-- ✅ Chart shows only after loading -->
  <canvas v-if="!isLoadingForecast" ref="forecastChart" class="forecast-canvas"></canvas>

  <div v-if="!isLoadingForecast" class="forecast-legend">
    <span class="legend-item"><span class="legend-dot low"></span> Low </span>
    <span class="legend-item"><span class="legend-dot moderate"></span> Moderate </span>
    <span class="legend-item"><span class="legend-dot high"></span> Crowded </span>
  </div>
</div>


</div>

  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import sensorLocations from '@/assets/sensor_locations.json';
// import Chart from 'chart.js/auto';
import { Chart, ArcElement, Tooltip, Legend, registerables } from 'chart.js';


Chart.register(...registerables);

const userInput = ref('');
const selectedSensor = ref(null);
const feedback = ref('');
const feedbackClass = ref('');
const suggestionsVisible = ref(false);
const filteredSuggestions = ref([]);
const forecast = ref([]);
const forecastChart = ref(null);
let chartInstance = null;
const liveStatusText = ref(''); // new
const liveStatusClass = ref('');

const isLoadingForecast = ref(false);


const gaugeChart = ref(null);
let gaugeInstance = null;

const resultSection = ref(null);
const forecastSection = ref(null);
const showForecast = ref(false);


function drawGaugeChart(crowdValue) {
  // Wait a tick to ensure DOM is ready
  setTimeout(() => {
    if (!gaugeChart.value) return;

    const value = Math.min(crowdValue, 30); // cap at 30
    const ctx = gaugeChart.value.getContext('2d');

    const data = {
      datasets: [{
        data: [value, 30 - value],
        backgroundColor: [
          getGradient(ctx, gaugeChart.value),
          '#e5e7eb'
        ],
        borderWidth: 0,
        cutout: '80%',
        circumference: 180,
        rotation: -90
      }]
    };

    const options = {
      responsive: false,
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false }
      }
    };

    if (gaugeInstance) gaugeInstance.destroy();
    gaugeInstance = new Chart(ctx, {
      type: 'doughnut',
      data,
      options,
      plugins: [{
  id: 'needle',
  afterDatasetDraw(chart) {
    const { ctx, chartArea } = chart;
    const angle = (-0.5 + (value / 30)) * Math.PI;
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = chartArea.bottom;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -70); // needle length
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.restore();
  }
}]

    });
  }, 100); // wait a tick for the DOM to render
}
function resetAll() {
  userInput.value = '';
  selectedSensor.value = null;
  feedback.value = '';
  feedbackClass.value = '';
  filteredSuggestions.value = [];
  forecast.value = [];
  showForecast.value = false;
  liveStatusText.value = '';
  liveStatusClass.value = '';

  // Reset chart instances if needed
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (gaugeInstance) {
    gaugeInstance.destroy();
    gaugeInstance = null;
  }
}

// Create gradient background for arc
function getGradient(ctx, canvas) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#10b981');   // green (calm)
  gradient.addColorStop(0.5, '#facc15'); // yellow (moderate)
  gradient.addColorStop(1, '#ef4444');   // red (crowded)
  return gradient;
}





function filterSuggestions() {
  const input = userInput.value.trim().toLowerCase();
  filteredSuggestions.value = input
    ? sensorLocations.filter(sensor =>
        sensor.sensor_description.toLowerCase().includes(input)
      )
    : [];
}

function selectSuggestion(sensor) {
  selectedSensor.value = sensor;
  userInput.value = sensor.sensor_description;
  filteredSuggestions.value = [];
  suggestionsVisible.value = false;
}


function interpretCount(count) {
  if (count <= 150) {
    feedbackClass.value = 'success';
    return `✅ Great time to go! Only ${count} people around.\n 📍 (${selectedSensor.value.sensor_description})`;
  } else if (count <= 450) {
    feedbackClass.value = 'moderate';
    return `⚠️ Moderate crowd detected: ${count} people.\n 📍 (${selectedSensor.value.sensor_description})`;
  } else {
    feedbackClass.value = 'crowded';
    return `🚨 High activity: ${count} people in the area.\n 📍 (${selectedSensor.value.sensor_description})`;
  }
}

async function checkCrowdForPlace() {
  if (!selectedSensor.value) {
    feedback.value = '❌ Please choose a valid place from the list.';
    feedbackClass.value = 'error';
    scrollToResultSmoothly(); // 🔁 scroll even on error
    return;
  }

  const locationId = selectedSensor.value.location_id;
  const apiUrl = `https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/pedestrian-counting-system-past-hour-counts-per-minute/records?where=location_id=${locationId}&order_by=sensing_datetime DESC&limit=30`;

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();
    const records = data.results;

    if (records && records.length) {
      const total = records.reduce((sum, r) => sum + (r.total_of_directions || 0), 0);
      const avgPerMinute = total / records.length;

      // Update UI feedback
      if (avgPerMinute <= 3) {
        liveStatusText.value = 'Very calm';
        liveStatusClass.value = 'status-calm';
        feedbackClass.value = 'success';
      } else if (avgPerMinute <= 7) {
        liveStatusText.value = 'Not too busy';
        liveStatusClass.value = 'status-moderate';
        feedbackClass.value = 'moderate';
      } else if (avgPerMinute <= 15) {
        liveStatusText.value = 'Moderately busy';
        liveStatusClass.value = 'status-busy';
        feedbackClass.value = 'moderate';
      } else {
        liveStatusText.value = 'Crowded';
        liveStatusClass.value = 'status-crowded';
        feedbackClass.value = 'crowded';
      }

      feedback.value = `
        🚶‍♂️<strong>${Math.round(avgPerMinute)} people/min passing</strong><br>
        📍 <strong>(${selectedSensor.value.sensor_description})</strong><br>
      `;

      scrollToResultSmoothly(); // ✨ smooth scroll BEFORE chart render
      await nextTick();
      drawGaugeChart(avgPerMinute);

    } else {
      feedback.value = '⚠️ No recent data available for this location.';
      feedbackClass.value = 'error';
      scrollToResultSmoothly(); // ✅ scroll even if no data
    }

    await getForecast();

  } catch (e) {
    feedback.value = '⚠️ Error retrieving live data.';
    feedbackClass.value = 'error';
    scrollToResultSmoothly(); // ✅ scroll on error
  }
}


function scrollToResultSmoothly() {
  // Delay scroll just enough for DOM + animation to stabilize
  setTimeout(() => {
    if (resultSection.value) {
      resultSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 300); // Adjust timing if needed (300–500ms works well)
}

async function getForecast() {
  if (!selectedSensor.value) return;

  isLoadingForecast.value = true; // ⏳ START loading

  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  forecast.value = [];

  for (let i = 0; i <= 5; i++) {
    const hour = (today.getHours() + i) % 24;
    try {
      const res = await fetch('https://wheelmelb.online:8080/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: selectedSensor.value.sensor_description,
          hour,
          date: formattedDate
        })
      });

      const data = await res.json();
      const prediction = Array.isArray(data.predictions) ? data.predictions[0] : 0;
      forecast.value.push({ hour, count: Math.max(0, prediction) });

    } catch (err) {
      forecast.value.push({ hour, count: 0 });
    }
  }

 isLoadingForecast.value = false;
await nextTick(); // ✅ wait for canvas to render
drawForecastChart();

}


function drawForecastChart() {
  if (!forecastChart.value) return;
  const ctx = forecastChart.value.getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const labels = forecast.value.map(p => `${p.hour.toString().padStart(2, '0')}:00`);
  const values = forecast.value.map(p => Math.round(p.count));

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Predicted Crowd',
        data: values,
        fill: 'origin',
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: values.map(getCrowdColor),
        borderWidth: 3,
        segment: {
          borderColor: ctx => {
            const val = ctx.p0.parsed.y;
            return getCrowdColor(val);
          },
          backgroundColor: ctx => {
            const val = ctx.p0.parsed.y;
            return hexToRGBA(getCrowdColor(val), 0.3);
          }
        }
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: context => `Predicted Crowd: ${Math.round(context.parsed.y)}`
          }
        },
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'People' }
        },
        x: {
          title: { display: true, text: 'Hour' }
        }
      }
    }
  });
}


function getCrowdColor(value) {
  if (value <= 150) return '#10b981';   // green
  if (value <= 450) return '#facc15';   // yellow
  return '#ef4444';                    // red
}

function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hideSuggestionsLater() {
  setTimeout(() => {
    suggestionsVisible.value = false;
  }, 100);
}


// 👇 This splits your forecast into color-coded line chunks
function splitIntoSegments(labels, values) {
  const segments = [];
  let currentColor = getCrowdColor(values[0]);
  let currentSegment = { data: [], color: currentColor };

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const color = getCrowdColor(val);

    if (color !== currentColor && currentSegment.data.length) {
      segments.push(currentSegment);
      currentColor = color;
      currentSegment = { data: [], color };
    }

    currentSegment.data[i] = val;
  }

  segments.push(currentSegment);
  return segments;
}

async function onForecastToggle() {
  showForecast.value = !showForecast.value;
  if (showForecast.value) {
    await nextTick();
    drawForecastChart();
  }
}

watch(userInput, (newVal) => {
  const match = sensorLocations.find(sensor =>
    sensor.sensor_description.toLowerCase() === newVal.toLowerCase()
  );

  if (!match) {
    selectedSensor.value = null;
    feedback.value = '';
    feedbackClass.value = '';
    showForecast.value = false; // ❌ Hide forecast if invalid input
  } else {
    selectedSensor.value = match;
    feedback.value = '';
    feedbackClass.value = '';
  }
});



</script>



<style scoped>
.locationContainer {
  display: flex;
  flex-direction: column;  /* 🔁 Stack vertically */
  justify-content: center;
  align-items: center;
  gap: 2rem;
    height: auto;
  margin-bottom: 2rem; /* optional spacing before the chart */
}

.input-label {
  font-size: 1rem;
  color: #000000;
  margin-bottom: 0.3rem;
  padding-left: 0.2rem;
}
.inputContainer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: start;
  /* justify-content: center; */
  justify-content: start;
  height: 100%;
  width: 50%;
  border: 1px solid #ccc;
}
.main-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  /* background: linear-gradient(to bottom, #b4a47dbf 55%, #38a0e5b0); */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
  border-bottom: 1px solid #ccc;
}

.main-container video{
 position: absolute;
  top: 50%;
  left: 50%;
  min-width: 100%;
  min-height: 100%;
  transform: translate(-50%, -50%);
  object-fit: cover;
  z-index: 0;
  pointer-events: none; /* ✅ Add this line */
}

/* .overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
} */
.buttonBottonLine {
  position: absolute;
  bottom: 0;
  width: 100vw;
  height: 34px;
  background-color: #ffffff;
  border-top-left-radius: 34px;
  border-top-right-radius: 34px;
  z-index: 1;
}

/* .introduceContainer {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: auto;
  text-align: center;
  background-image: url('./image/new-7.png');
  aspect-ratio: 3/1;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
  color: #2f2f2f;
} */

/* .introduceContainer h1 {
  font-size: 50px;
  font-weight: bold;
  margin-bottom: 1rem;
  color: rgb(255, 255, 255);
  z-index: 1;
} */

/* .introduceContainer h3 {
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 1rem;
  color: rgb(255, 255, 255);
  z-index: 1;
}

.introduceContainer p {
  font-size: 24px;
} */
/* @media (max-width: 960px) {
  .introduceContainer h3 {
    display: none;
  }
} */
/* Mobile Responsive Header and Image */
/* @media (max-width: 768px) {
  .introduceContainer {
    padding: 1rem;
  }
  .introduceContainer h1 {
    font-size: 2rem;
  }
} */

/* @media (max-width: 430px) {
  .introduceContainer {
    aspect-ratio: 2/1;
  }
  .introduceContainer h1 {
    font-size: 1.3rem;
  }
} */

.sensor-page-wrapper {
  position: relative;

  /* margin: 20px; */
  /* margin-top: 8rem; */
   padding-top: 8rem; /* ⬅️ Increased from 3rem */
  padding-right: 10%;
  padding-left: 10%;
  width: 100%;
  min-height: 100vh;
  /* padding: 2rem; */
  /* background: rgba(255, 255, 255, 0.93); */
  /* border-radius: 16px; */
  /* box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); */
  text-align: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 2;
}



.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.wheelchair-icon {
  font-size: 1.5rem;
}

.subtitle {
  font-size: 0.95rem;
  color: #555;
  margin-bottom: 1.5rem;
}

.autocomplete-wrapper {
  position: relative;
  height: 100%;
  width: 700px;
  /* margin-bottom: 1rem; */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  /* border: 2px solid #dddddd; */
  border-radius: 8px;
  padding: 3rem;
  /* background-color: #fdf6e3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); */
  background-color: #e8f1fb; /* Light blue */
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.1); /* Blue-tinted shadow */
}

.autocomplete-wrapper label{
  font-size: 2rem;
  font-weight: bold;
    color: #1e3a8a; /* Dark blue */
}

@media (max-width: 900px) {
  .autocomplete-wrapper {
  width: 100%;
}
}


.input-with-reset {
  position: relative;
  width: auto;
  width: 100%;
  /* height: 100%; */
}

.input-box {
  width: 100%;
  height: 100%;
  padding: 0.8rem 2.5rem 0.8rem 0.8rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 1rem;
}

.reset-btn {
  position: absolute;
  right: 10px;
  top: 8px;
  background: transparent;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #888;
}

.check-btn {
  min-width: 5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
   background-color: #1e3a8a; /* Blue */
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  /* margin-top: 0.5rem; */
  transition: background 0.3s ease;
}

.check-btn:hover {
  background-color: #4263ce;
}

.result-box {
  /* margin-top: 1.5rem; */
  font-weight: bold;
  font-size: 1.1rem;
  padding: 1rem;
  border-radius: 8px;

  height: 100%;
  width: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  /* text-align: center;  */
  text-align: left;
  padding: 3rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.always-default-box {
  background-color: #e8f1fb; /* same as the blue autocomplete box */
  color: #1e3a8a;
}

.error {
  background-color: #fee2e2;
  color: #b00020;
}

.suggestions {
  position: absolute;
  top: 100%; /* aligns directly under the input */
  background: white;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 0 0 8px 8px;
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: 999;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.suggestions li {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-size: 0.95rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.suggestions li:last-child {
  border-bottom: none;
}

.suggestions li:hover {
  background-color: #dbeafe;
}

.forecast-section {
  margin: 2rem auto;
  border-radius: 8px;
  padding: 3rem; /* Match .result-box padding */
  background-color: #e8f1fb; /* Match .always-default-box color */
  color: #1e3a8a;
  width: 50%; /* Match .result-box width */
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
@media (max-width: 550px) {
  .forecast-section {
    width: 100%;
    padding: 2.5rem;
  }
}

/* .forecast-section h3 {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
} */

.forecast-section h3.section-title {
  color: #1e3a8a;
}


.loading-spinner {
  margin-top: 2rem;
  font-style: italic;
  color: #555;
  font-size: 1rem;
}

.suggestions .close-button {
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
  color: #1e3a8a;
  cursor: pointer;
  padding: 4px 8px;
  border-bottom: 1px solid #ddd;
}
.suggestions .close-button:hover {
  color: #d32f2f;
}


.section-title {
  font-size: 1.3rem;
  font-weight: bold;
  color: #1e3a8a;
}


@media (max-width: 600px) {

  .section-title {
    font-size: 1rem;
  }

  .sensor-page-wrapper {
    /* margin: 1rem; */
    padding: 8rem 1rem;
  }
  .input-box {
    font-size: 0.95rem;
    border: 1px solid #3b82f6;
  }
  .check-btn {
    font-size: 0.95rem;
    width: 100%;
  }
  .result-box {
    font-size: 1rem;
  }
}

@media (max-width: 550px) {
  /* .section-title {
    font-size: 1rem;
  } */
  /* .autocomplete-wrapper {
    width: 100%;
    height: 50%;
  }
  .result-box {
    width: 100%;
    height: 50%;
  } */
  .locationContainer {

    flex-direction: column;
    justify-content: flex-start;
    height: auto;
  }
  .autocomplete-wrapper label{
    font-size: 1.7rem;
  }
  .forecast-section h3{
    font-size: 1.7rem;
  }
}

@media (max-width: 425px) {
  .autocomplete-wrapper {
    padding: 2.5rem;
  }
  .result-box {
    padding: 2.5rem;
  }
  .autocomplete-wrapper label{
    font-size: 1.3rem;
  }
  .forecast-section h3{
    font-size: 1.3rem;
  }
}


@media (max-width: 340px) {
  /* .autocomplete-wrapper {
    padding: 1.5rem;
  }
  .result-box {
    padding: 1.5rem;
  } */
  .autocomplete-wrapper label{
    font-size: 1.2rem;
  }
  .forecast-section h3{
    font-size: 1.2rem;
  }
}
canvas {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
.result-box {
  flex-direction: column; /* ⬅️ Make it vertical layout */
  align-items: center;     /* Center contents horizontally */
  text-align: center;      /* Center text */
}

.feedback-text {
  margin-bottom: 1.5rem; /* ⬅️ Add space below the text */
  line-height: 1.6;       /* Better line spacing */
}

.gauge-style {
  margin-top: 1rem;
  width: 220px;
  height: 140px;
}

.live-status {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: #b91c1c;
  gap: 0.5rem;
}

.live-dot {
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  animation: pulse 1.2s infinite;
  box-shadow: 0 0 0 rgba(255, 0, 0, 0.7);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
  }
}

.gauge-wrapper {
  position: relative;
  width: 220px;
  height: 160px;
  margin-top: 1rem;
  margin-bottom: 1.5rem; /* ✅ Add spacing below gauge */
}

.gauge-label {
  position: absolute;
  bottom: 0;
  font-size: 0.9rem;
  font-weight: bold;
  color: #333;
}

.gauge-label.left {
  left: 0;
}

.gauge-label.right {
  right: 0;
}

.live-status-text {
  font-weight: bold;
}

.status-calm {
  color: #10b981; /* green */
}

.status-moderate {
  color: #f59e0b; /* amber */
}

.status-busy {
  color: #d97706; /* darker amber */
}

.status-crowded {
  color: #dc2626; /* red */
}
.forecast-canvas {
  width: 100%;
  max-width: 600px;
  height: 250px;
  margin: 0 auto;    /* Center horizontally */
}

.forecast-canvas {
  width: 100%;
  max-width: 100%;
  aspect-ratio: 3 / 2; /* 🔁 Responsive height */
  margin: 0 auto;
}

@media (max-width: 600px) {
  .forecast-canvas {
    max-width: 100%;
    height: 200px;
  }
}

.forecast-toggle {
  margin-top: 1rem;
  cursor: pointer;
}

.toggle-link {
  font-weight: bold;
  color: #1e3a8a;
}

.underline-only {
  text-decoration: underline;
  color: #1e3a8a;
  cursor: pointer;
  transition: color 0.3s ease;
}

.underline-only:hover {
  color: #2563eb; /* change only on hover */
}
.underline-part {
  text-decoration: underline;
}


.forecast-legend {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: #1e3a8a;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.legend-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot.low {
  background-color: #10b981;
}

.legend-dot.moderate {
  background-color: #facc15;
}

.legend-dot.high {
  background-color: #ef4444;
}
.lds-dual-ring {
  display: inline-block;
  width: 48px;
  height: 48px;
}
.lds-dual-ring:after {
  content: " ";
  display: block;
  width: 32px;
  height: 32px;
  margin: 8px;
  border-radius: 50%;
  border: 6px solid #1e3a8a;
  border-color: #1e3a8a transparent #1e3a8a transparent;
  animation: lds-dual-ring 1.2s linear infinite;
}
@keyframes lds-dual-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}


</style>


