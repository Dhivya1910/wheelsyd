<script setup>
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import 'primeicons/primeicons.css';
import { ref, onMounted, computed } from 'vue';
import Swiper from 'swiper/bundle';
import 'swiper/swiper-bundle.min.css';
import { useRouter } from 'vue-router';
import AccessibleStopsChart from '@/components/icons/AccessibleStopsChart.vue';
import ProgressBar from 'primevue/progressbar';


const valueDay = ref(0);
const targetDay = ref(100);
const ratioDay = computed(() => (valueDay.value / targetDay.value*100).toFixed(0));

const valueMonth = ref(0);
const targetMonth = ref(3000);
const ratioMonth = computed(() => (valueMonth.value / targetMonth.value*100).toFixed(0));

const valueYear = ref(0);
const targetYear = ref(10000);
const ratioYear = computed(() => (valueYear.value / targetYear.value * 100).toFixed(0));



const router = useRouter();

const switchPage = (path) => {
  router.push(path).then(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
};

onMounted(async () => {

  await fetchData();


  new Swiper('.mySwiper', {
    slidesPerView: 1,
    centeredSlides: true,
    loop: true,
    loopAdditionalSlides: 3,
    // autoplay: {
    //   delay: 10000,
    //   disableOnInteraction: false,
    // },
    speed: 7000,
    simulateTouch: false,
    allowTouchMove: false,
    // autoHeight: true,
    preloadImages: true,
  });

  new Swiper('.introduceSwiper', {
    direction: 'vertical',
    slidesPerView: 3,
    centeredSlides: true,
    loop: true,
    loopedSlides: 10,
    loopAdditionalSlides: 10,
    autoplay: {
      delay: 0,
      disableOnInteraction: false,
    },
    speed: 7000,
    autoHeight: true,
    preloadImages: true,
    containerClass: 'introSwiper',
    wrapperClass: 'introSwiper-wrapper',
    slideClass: 'introSwiper-slide',
  });
});


const fetchData = async () => {
  try {
    const response = await fetch('https://user-count.noisyventi.workers.dev/'); // Worker
    const data = await response.json();

    // update
    valueDay.value = data.day;
    valueMonth.value = data.month;
    valueYear.value = data.year;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

const rollingPageToSIldeEnd = function() {
  const target = document.getElementById("sildeEnd");


  const top = document.getElementById("sildeEnd").offsetTop;
  window.scrollTo({ top, behavior: "smooth" });


};
</script>

<template>
  <div class="main-container">
    <!-- Swiper Section -->
    <div class="swiper mySwiper">
      <div class="swiper-wrapper">
        <!-- Slide 1 -->
        <div class="swiper-slide">

          <!-- Joined Image & Text Card -->
          <div class="swiper-image-wrapper">
            <div class="overlay"></div>
            <video src="./video/headervideo-short.mp4"  alt="Slide 1"  autoplay muted loop playsinline poster="./image/posterVideo.png"></video>
          </div>
          <div class="trapezoid-box">
            <h1 class="app-title">WheelSyd</h1>
            <p class="highlighted-text">
              Discover wheelchair-friendly routes and accessible places tailored just for you
            </p>
            <button class="navigate-button" @click="switchPage('/map')">
              Let's Explore
            </button>
          </div>
          <div id="sildeEnd" class="sileButtonBotton"  @click="rollingPageToSIldeEnd()">
            <img class="sildeButton" src="./image/sildeButton.png" alt="sileButton"   />
            <img class="gifArrow" src="./image/gifArrow.gif" alt="sileButton" />
          </div>
          <div class="buttonBottonLine">

          </div>
        </div>
        <!-- Slide 2 -->
        <div class="swiper-slide">
          <div class="swiper-image-wrapper">
            <img src="./image/new-2.png" alt="Slide 2" />
          </div>
          <div class="trapezoid-box">
            <h1 class="app-title">WheelSyd</h1>
            <p class="highlighted-text">
              We empower people with disabilities through personalized mobility planning, accessible venue info, wheelchair-friendly routes, and a supportive community — breaking social and physical barriers.
            </p>
            <button class="navigate-button" @click="switchPage('/map')">
              Let's Explore
            </button>
          </div>
        </div>
        <!-- Slide 3 -->
        <div class="swiper-slide">
          <div class="swiper-image-wrapper">
            <img src="./image/new-4.png" alt="Slide 3" />
          </div>
          <div class="trapezoid-box">
            <h1 class="app-title">WheelSyd</h1>
            <p class="highlighted-text">
              We empower people with disabilities through personalized mobility planning, accessible venue info, wheelchair-friendly routes, and a supportive community — breaking social and physical barriers.
            </p>
            <button class="navigate-button" @click="switchPage('/map')">
              Let's Explore
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- <br /><br /> -->




    <div  class="background-white userSadBacground wow animate__animated animate__fadeInLeft" >
      <div class=" swiperUser wow animate__animated animate__fadeInRight">
        <h2 class="titleText ">
          It's hard to imagine the difficulties wheelchair users face
        </h2>
        <div class="difficultContainer">

          <div class="introSwiper introduceSwiper">
            <div class="introSwiper-wrapper">
              <!-- Slide 1 -->
              <div class="introSwiper-slide">
                <!-- Joined Image & Text Card -->
                  <p class="highlighted-text">
                    "I often can't find elevators that are wheelchair accessible."
                  </p>
              </div>
              <!-- Slide 2 -->
              <div class="introSwiper-slide">
                  <p class="highlighted-text">
                    "Public transport vehicles don't have enough space for me to get in and out."
                  </p>
              </div>
              <!-- Slide 3 -->
              <div class="introSwiper-slide">

                  <p class="highlighted-text">
                    "When the escalators at the subway stations are out of order, I can't get on or off."
                  </p>
              </div>
              <!-- Slide 4 -->
              <div class="introSwiper-slide">

                  <p class="highlighted-text">
                    "The ramps at doorways are too steep for me to get in independently."
                  </p>
              </div>
              <!-- Slide 5 -->
              <div class="introSwiper-slide">

                  <p class="highlighted-text">
                    "Some stores don't have enough space for me to turn around."
                  </p>
              </div>
              <!-- Slide 6 -->
              <div class="introSwiper-slide">

                  <p class="highlighted-text">
                    "The uneven pavement often causes my wheelchair to get stuck or wobble."
                  </p>
              </div>
              <!-- Slide 7 -->
              <div class="introSwiper-slide">

                  <p class="highlighted-text">
                    "There are no suitable restroom facilities when I'm out and about."
                  </p>
              </div>
              <!-- copy of slide -->
              <!-- Slide 1 -->
              <div class="introSwiper-slide">
                <!-- Joined Image & Text Card -->
                  <p class="highlighted-text">
                    "I often can't find elevators that are wheelchair accessible."
                  </p>
              </div>
              <!-- Slide 2 -->
              <div class="introSwiper-slide">
                  <p class="highlighted-text">
                    "Public transport vehicles don't have enough space for me to get in and out."
                  </p>
              </div>
              <!-- Slide 3 -->
              <div class="introSwiper-slide">

                  <p class="highlighted-text">
                    "When the escalators at the subway stations are out of order, I can't get on or off."
                  </p>
              </div>
              <!-- Slide 4 -->
              <div class="introSwiper-slide">

                  <p class="highlighted-text">
                    "The ramps at doorways are too steep for me to get in independently."
                  </p>
              </div>
              <!-- Slide 5 -->
              <div class="introSwiper-slide">

                  <p class="highlighted-text">
                    "Some stores don't have enough space for me to turn around."
                  </p>
              </div>
              <!-- Slide 6 -->
              <div class="introSwiper-slide">

                  <p class="highlighted-text">
                    "The uneven pavement often causes my wheelchair to get stuck or wobble."
                  </p>
              </div>
              <!-- Slide 7 -->
              <div class="introSwiper-slide">

                  <p class="highlighted-text">
                    "There are no suitable restroom facilities when I'm out and about."
                  </p>
              </div>
            </div>
    </div>

        </div>
      </div>
    </div>

    <div class="background-lightGreen ">
      <div class="Container wow animate__animated animate__fadeInLeft">
        <div class="textContainer">
        <h2>A website established to assist people using wheelchairs</h2>
          <h3>
            If you're unfamiliar with public facilities, moving around freely can be difficult,
          </h3>
          <h3>
            understanding our planning and assistance is important.
          </h3>
          <div class="progressbarSum">
            <div class="progressbarDay">
              <h3 class="valueNumber">
                <span class="greenHighlight">{{ valueDay }}</span>
              </h3>
              <h3 class="longerText">
                People who accessed our website today
              </h3>
              <h3 class="shorterText">
                Today
              </h3>
              <div class="ProgressBarContainer">
                <ProgressBar :value="Number(ratioDay)">
                  {{ ratioDay }}%
                </ProgressBar>
              </div>
              <h3 class="longerText">
                Today's objective <span class="greenHighlight">{{ targetDay }}</span>
              </h3>
              <h3 class="shorterText">
                <span class="greenHighlight">{{ targetDay }}</span>
              </h3>
            </div>
            <div class="progressbarMonth">
              <h3 class="valueNumber">
                <span class="greenHighlight">{{ valueMonth }}</span>
              </h3>
              <h3 class="longerText">
                Visitors this month exploring accessibility
              </h3>
              <h3 class="shorterText">
                Month
              </h3>
              <div class="ProgressBarContainer">
                <ProgressBar :value="Number(ratioMonth)">
                  {{ ratioMonth }}%
                </ProgressBar>
              </div>
              <h3 class="longerText">
                The target for this month <span class="greenHighlight">{{ targetMonth }}</span>
              </h3>
              <h3 class="shorterText">
                <span class="greenHighlight">{{ targetMonth }}</span>
              </h3>
            </div>
            <div class="progressbarYear">
              <h3 class="valueNumber">
                <span class="greenHighlight">{{ valueYear }}</span>
              </h3>
              <h3 class="longerText">
                Annual visitors for inclusive navigation
              </h3>
              <h3 class="shorterText">
                Year
              </h3>
              <div class="ProgressBarContainer">
                <ProgressBar :value="Number(ratioYear)">
                  {{ ratioYear }}%
                </ProgressBar>
              </div>
              <h3 class="longerText">
                This year's goal <span class="greenHighlight">{{ targetYear }}</span>
              </h3>
              <h3 class="shorterText">
                <span class="greenHighlight">{{ targetYear }}</span>
              </h3>
            </div>
          </div>
      </div>
    </div>

    </div>



    <!-- Map Section 1 -->
    <!-- <div class="background-white">

        <div class="mapContainer">
        <div class="imgContainer">
          <img src="./image/new-6.png" alt="Accessible Facilities" />
        </div>
        <div class="describeContainer">
          <h2>Explore Melbourne CBD</h2>
          <h3 class="highlighted-text">
            Discover accessible hotels, malls, cafes, and stores with entry ramps and restrooms & get wheelchair friendly navigation pathways.
          </h3>
        </div>
      </div>


    </div> -->

        <!-- Chart Section -->
    <!-- <div class="trackerContainer full-width-chart">
      <AccessibleStopsChart />
    </div> -->



    <!-- Routine Section -->
    <!-- <div class="background-white">
      <div class="routineContainer wow animate__animated animate__fadeInRight">
    <div class="imgContainer">
      <img src="./image/crowd.jpg" alt="Routine Image" />
    </div>
    <div class="describeContainer">
      <h2>Platform Sensor</h2>
      <h3 class="highlighted-text">
        Get real-time and forecasted crowd insights across Sydney CBD busiest areas helping you plan safer, smoother, and more confident journeys.
      </h3>
      <button class="navigate-button" @click="switchPage('/platformsensor')">
        View Platform Sensors
      </button>
    </div>
  </div>
    </div> -->
  </div>

</template>

<style scoped>
.sildeButton {
  height: 100px;
  object-fit: contain;
}
.gifArrow {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
  object-fit: contain;
}
@media (max-width: 530px) {
  .sildeButton {
  height: 50px;
}
  .gifArrow {
    height: 40px;
  }

}



.sileButtonBotton {
  position: absolute;
  bottom: 33.5px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.buttonBottonLine {
  position: absolute;
  bottom: 0;
  width: 100vw;
  height: 34px;
  background-color: #ffffff;
  border-top-left-radius: 34px;
  border-top-right-radius: 34px;
}
.swiper-wrapper {
  height: 100vh;
}
.userSadBacground {
  background-image: url('./image/womanSadPerson3.png');
  background-size: cover;
  background-position: right center;
  background-repeat: no-repeat;
  backdrop-filter: blur(10px);
  width: 100vw !important;
  height: 26rem;
}

@media (max-width: 500px) {
  .userSadBacground {
    background-image: none;
  }
}

/* introstyle */
.introSwiper {
  width: 70%;
  margin-top: 1rem;
  /* margin-left: 15rem; */
  overflow: hidden;
  height: 15rem;
  position: relative;
  background-color: #ffffff71;
  border-radius: 15px;
  /* backdrop-filter: blur(10px); */
  box-shadow: inset 0 0 7px rgba(0, 0, 0, 0.5);
}


.greenHighlight {
  color: #4CAF50;
  font-size: 20px;
  font-weight: 600;
}
.difficultContainer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: auto;
  width: 100%;
}

@media (max-width: 500px) {
  .difficultContainer {
    justify-content: center;
    align-items: center;
}
  .introSwiper {
    width: 100%;
  }
}
/* .introSwiper .introSwiper-wrapper {
  animation: scrollDown 50s linear infinite;
}

@keyframes scrollDown {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-233%);
  }
} */

.introSwiper-slide {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  border-radius: 12px;
  transition: opacity 1s ease-in-out;
  /* opacity: 0.5; */
  justify-content: center;
  align-items: center;
}
/* .introSwiper-slide-active {
  opacity: 1;
} */

/* Default desktop styling */
.introSwiper-image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.introSwiper-image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 12px;
  filter: none !important;
}


.ProgressBarContainer {
  width: 100%;
  height: 2rem;
}


.progressbarSum {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  height: 5rem;
  width: 100%;
  gap: 5%;
  margin-top: 3rem;
}


.swiperUser {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  width: 80%;
  height: 100%;
}


.swiperUser h2{
  font-size: 40px !important;
  font-weight: 600;
}

@media (max-width: 1700px) {
  .swiperUser h2{
  font-size: 35px !important;
  font-weight: 600;
}

.swiperUser p{
  font-size: 1.35rem;
}
}

@media (max-width: 1450px) {
  .swiperUser h2{
  font-size: 30px !important;
  font-weight: 600;
}
.swiperUser p{
  font-size: 1.25rem;
}

}

@media (max-width: 1000px) {
  .swiperUser h2{
  font-size: 25px !important;
  font-weight: 600;
}
.swiperUser p{
  font-size: 1.1rem;
}

}

@media (max-width: 850px) {
  .swiperUser h2{
  font-size: 23px !important;
  font-weight: 700 !important;
}

.swiperUser p{
  font-size: 1rem;
}
}

@media (max-width: 700px) {
  .swiperUser p{
  font-size: 0.9rem;
}
}

@media (max-width: 500px) {
  .swiperUser {
    justify-content: center;
    align-items: center;
}
}

/* @media (max-width: 780px) {
  .swiperUser h2{
  font-size: 20px !important;
}
}

@media (max-width: 700px) {
  .swiperUser h2{
  font-size: 16px !important;
  color: #000000;
}
}

@media (max-width: 550px) {
  .swiperUser h2{
  font-size: 13px !important;
  color: #000000;
}
} */

.swiperUser h3{
  font-size: 26px !important;
  font-weight: 400;
}

.swiperUser .titleText {
  text-align: right;
}
@media (max-width: 500px) {
  .swiperUser .titleText {
  text-align: center;
}
}

.textContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 80%;
  height: 100%;
  /* gap: 5%; */
}

.textContainer h2{
  font-size: 40px;
  font-weight: 600;
  color: #000000;
}

.shorterText {
  display: none;
}

@media (max-width: 1700px) {
  .textContainer h2{
  font-size: 38px;
  font-weight: 600;
  color: #000000;
}
.textContainer h3{
  font-size: 25px;
  font-weight: 400;
  color: #424242;
}
.textContainer .progressbarSum h3 {
  font-size: 15px !important;
  font-weight: 400;
}

.textContainer .progressbarSum .valueNumber {
  font-size: 30px ;
  font-weight: 500;
}
}

@media (max-width: 1500px) {
  .textContainer h2{
  font-size: 34px;
  font-weight: 600;
  color: #000000;
}
.textContainer h3{
  font-size: 25px;
  font-weight: 400;
  color: #424242;
}
.textContainer .progressbarSum h3 {
  font-size: 13px !important;
  font-weight: 400;
}

.textContainer .progressbarSum .valueNumber {
  font-size: 30px ;
  font-weight: 500;
}
}

@media (max-width: 1350px) {
  .textContainer h2{
  font-size: 26px;
  font-weight: 600;
  color: #000000;
}
.textContainer h3{
  font-size: 20px !important;
  font-weight: 400;
  color: #424242;
}
.textContainer .progressbarSum h3 {
  font-size: 13px !important;
  font-weight: 400;
}

.textContainer .progressbarSum .valueNumber {
  font-size: 30px ;
  font-weight: 500;
}

.longerText {
  display: none;
}
.shorterText {
  display: block;
}
}

@media (max-width: 1070px) {
  .textContainer h2{
  font-size: 22px;
  font-weight: 600;
  color: #000000;
}
.textContainer h3{
  font-size: 16px !important;
  font-weight: 400;
  color: #424242;
}
.textContainer .progressbarSum h3 {
  font-size: 13px !important;
  font-weight: 400;
}

.textContainer .progressbarSum .valueNumber {
  font-size: 30px ;
  font-weight: 500;
}
}



.textContainer h3{
  font-size: 25px;
  font-weight: 400;
  color: #424242;
}

.textContainer .progressbarSum h3 {
  font-size: 18px;
  font-weight: 400;
}

.textContainer .progressbarSum .valueNumber {
  font-size: 30px ;
  font-weight: 500;
}

.progressbarDay {
  height: 100%;
  width: 30%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.progressbarMonth {
  height: 100%;
  width: 30%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.progressbarYear {
  height: 100%;
  width: 30%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}




/* --- SWIPER & SLIDE LAYOUT --- */
.swiper {
  width: 100vw;
  /* margin-top: 5rem; */
  overflow: hidden;
  height: 100vh;
  position: relative;
}



/* @media (max-width: 992px) {
  .swiper {
    height: 55vh;
  }
}
@media (max-width: 768px) {
  .swiper {
    height: auto;
    min-height: 45vh;
  }
} */

/* @media (max-width: 650px) {
  .swiper {
    margin-top: 4rem;
  }
}
@media (max-width: 450px) {
  .swiper {
    margin-top: 3.5rem;
  }
}
@media (max-width: 350px) {
  .swiper {
    margin-top: 3rem;
  }
} */


/* @media (max-width: 480px) {
  .swiper {
    height: auto;
    min-height: 40vh;
  }
} */

.swiper-slide {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  border-radius: 12px;
  transition: opacity 1s ease-in-out;
  /* opacity: 0; */
  justify-content: center;
  align-items: center;
}
.swiper-slide-active {
  opacity: 1;
}

/* Default desktop styling */
.swiper-image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.swiper-image-wrapper video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  /* border-radius: 12px; */
  filter: none !important;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

/* --- MOBILE STYLES: Joined Image & Text Card --- */
@media (max-width: 768px) {
  .swiper-slide {
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  /* Reorder so the image appears above the text */
  /* .swiper-image-wrapper {
    order: 1;
    margin: 0;
    border-radius: 12px 12px 0 0;
  } */
  /* .trapezoid-box {
    order: 2;
    margin: 0;
    border-radius: 0 0 12px 12px;
  } */

  /* Apply common styling for a unified card look */
  /* .swiper-image-wrapper,
  .trapezoid-box {
    clip-path: none;
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 1rem;
  } */

  /* Remove any extra gap between the joined cards */
  /* .swiper-image-wrapper + .trapezoid-box {
    border-top: none;
    padding-top: 0;
  } */

  /* Center and constrain the image within its container */
  .swiper-image-wrapper img {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 300px; /* Adjust as needed */
    object-fit: contain;
    margin: 0 auto;
  }
}




.trapezoid-box {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    /* clip-path: polygon(0% 0%, 100% 0%, 80% 100%, 0% 100%); */
    padding: 8rem;
    /* padding-right: 10rem; */
    /* border-top-left-radius: 12px;
    border-bottom-left-radius: 12px; */
    margin: 0;
    text-align: justify;
    /* background-color: #f0f4f898; */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

.trapezoid-box p{
  font-size: 2.5rem !important;


}


@media (max-height: 800px) {
  .trapezoid-box h1{
    font-size: 50px;
  }

  .trapezoid-box {
    padding: 1rem;
  }

  .trapezoid-box p{
    font-size: 40px !important;
  }

  .trapezoid-box .highlighted-text{
    padding: 0.5rem;
  }
}


@media (max-width: 1500px) {
  .trapezoid-box {
    padding: 5rem;
    /* padding-right: 10rem; */
  }
}


@media (max-width: 1200px) {
  .trapezoid-box {
    padding: 3rem;
    /* padding-right: 10rem; */
  }
}

@media (max-width: 900px) {
  .trapezoid-box {
    padding: 1rem;
    /* padding-right: 5rem;
    padding-left: 2rem; */
  }
}

@media (max-width: 710px) {
  .trapezoid-box h1{
    font-size: 55px;
  }

  .trapezoid-box {
    padding: 1rem;
    /* padding-right: 2rem;
    padding-left: 1rem; */
  }

  .trapezoid-box p{
    font-size: 35px !important;
  }

  .trapezoid-box .highlighted-text{
    padding: 0.5rem;
    /* padding-top: 0.5rem;
    padding-right: 2rem; */
  }

}

@media (max-width: 660px) {
  .trapezoid-box p{
    font-size: 25px !important;
  }

}

@media (max-width: 530px) {
  .trapezoid-box p{
    font-size: 22px !important;
  }

}
/* @media (max-width: 500px) {
  .trapezoid-box p{
    display: none;
  }

} */

@media (max-width: 425px) {
  .trapezoid-box h1{
    font-size: 45px ;
  }

}


/* --- DESKTOP TRAPEZOID STYLING --- */

  .trapezoid-box .highlighted-text {
    color: #ffffff !important;
    font-weight: 600;
  }


/* Typography & button styling */
.app-title {
  height: auto;
  width: auto;
  text-align: center;
  font-size: 5rem;
  font-weight: bold;
  color: #ffffff; /* Always visible in both modes */
  /* margin-bottom: 1rem; */
  padding: 1rem;
}

/* @media (max-width: 1100px) {
  .trapezoid-box p{
    font-size: 15px;
  }
  .app-title {
  margin-bottom: 0;
}
.trapezoid-box .highlighted-text {
  margin:0;
  }
} */

.highlighted-text {
  font-size: 1.35rem;
  line-height: 1.6;
  font-weight: 600;
  color: #000000;
  text-align: justify;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 8px;
  word-break: break-word;
}

.highlighted-text p{
  text-align: center;


}

@media (max-width: 480px) {
  .highlighted-text {
    font-size: 1.1rem;
    line-height: 1.4;
    padding: 0.8rem;
    margin: 0.8rem 0;
  }
}

/* --- REMAINING STYLES --- */
.main-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(to bottom, #d5e1ea 55%, rgba(158, 180, 202, 0.69));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.background-lightGreen {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgb(255, 255, 255);
  backdrop-filter: blur(5px);
  height: 26rem;
  width: 100%;
}

.titleText {
  color: #000000 !important;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.7); /* Optional: adds a subtle white outline for better visibility */
}

.background-lightGreen .Container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 85%;
  padding: 20px;
}



.background-white {
  display: flex;
  justify-content: center;
  align-items: center;
  /* background-color: rgba(255, 255, 255, 0.7); */
  backdrop-filter: blur(5px);
  height: 26rem;
  width: 85%;
  border-radius: 10px;
  /* padding: 20px; */
  /* margin-bottom: 3rem; */
}

.mapContainer {
  width: 95%;
  height: 20rem;
  display: flex;
  gap: 5%;
}

.describeContainer {
  width: 45%;
  padding: 1rem;
  text-align: justify;
}

.describeContainer h2 {
  text-align: center;
  font-size: 25px;
  font-weight: bold;
  color: #000;
}

.describeContainer h3 {
  font-size: 22px;
  text-align: justify;
  color: #000;
}

.imgContainer {
  width: 55%;
  height: 100%;
  border-radius: 20px;
  overflow: hidden;
}

.imgContainer img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 20px;
  filter: none;
}

.trackerContainer {
  width: 80%;
  margin: 3rem 0;
  display: flex;
  flex-wrap: wrap;
  gap: 5%;
}

.navigate-button {
  display: block;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  background-color: #1e3a8a;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 2rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  text-align: center;
}

.trapezoid-box .navigate-button {
  margin-top: 3rem;
 }

.describeContainer .navigate-button {
  display: block;
  margin: 1rem auto;
  padding: 1rem 1.5rem;
  background-color: #1e3a8a;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  text-align: center;
}

@media (max-width: 1100px) {
  .navigate-button {
    margin: 0 auto 0 auto;
  }
}

/* @media (max-width: 620px) {
  .navigate-button {
    font-size: 0.6rem;
  }
} */


.navigate-button:hover {
  background-color: #0056b3;
}

.routineContainer {
  width: 95%;
  height: 20rem;
  display: flex;
  gap: 5%;
  /* cursor: url('./image/exploreR.png'), pointer; */
}

.trackerContainer {
  width: 95%;
  margin: 3rem 0;
  display: flex;
  flex-wrap: wrap;
  gap: 5%;
}

.full-width-chart {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 0;
}

@media (max-width: 1400px) {
  .describeContainer h3 {
    font-size: 18px;
  }
}

/* Additional responsive adjustments */
@media (max-width: 1100px) {
  .introduceContainer p {
    font-size: 22px;
  }
  .describeContainer h3 {
    font-size: 16px;
  }
}

@media (max-width: 900px) {
  .describeContainer h3 {
    font-size: 15px;
  }
}

@media (max-width: 850px) {
  .describeContainer h3 {
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .introduceContainer p {
    text-align: left;
    font-size: 20px;
    padding: 0 10px;
  }
  .routineContainer,
  .mapContainer {
    height: auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: 0 0;
  }
  .imgContainer {
    width: 90%;
    height: 150px;
  }
  .describeContainer {
    width: 100%;
  }

  .describeContainer .highlighted-text {
    margin: 0;
    padding: 0
  }
  .background-lightGreen {
    height: auto;
    padding: 15px;
  }


}

@media (max-width: 600px) {
  .background-lightGreen {
    width: 100vw;
  }
  .background-lightGreen .Container {
    width: 100%;
    padding :0;
  }
  .introduceContainer {
    height: 20rem;
    margin-top: 1rem;
  }
  .introduceContainer p {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .describeContainer h2 {
    font-size: 20px;
  }
  .describeContainer h3 {
    font-size: 15px;
  }
  .routineContainer,
  .mapContainer {
    height: auto;
    gap: 15px;
  }
  .introduceContainer {
    height: 28rem;
    margin-top: 1rem;
  }
}

/* Extra tweaks for very small devices */
@media (max-width: 375px) {
  .describeContainer h3 {
    font-size: 13px;
  }
  .main-container {
    padding: 0 0.5rem;
  }
  .trapezoid-box {
    padding: 1rem;
  }
  .highlighted-text {
    font-size: 1rem;
    padding: 0.8rem;
  }
  .navigate-button {
    padding: 0.5rem 1rem;
    font-size: 1.6rem;
  }
  .mapContainer,
  .routineContainer {
    height: auto;
    flex-direction: column;
  }
  .imgContainer {
    height: 8rem;
  }
}
</style>
