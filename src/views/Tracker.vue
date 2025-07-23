<script setup>
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import 'primeicons/primeicons.css';
import { ref, onMounted } from 'vue';
// import Swiper from 'swiper';
// import 'swiper/swiper-bundle.css';



</script>




<template>
    <!-- <div class="about">
      <div class="content">
        <h1>This is an about page</h1>
        <p>This is a sample about page with clean white background.</p>
      </div>
    </div> -->

    <div class="main-container">
        
    
    <div class="introduceContainer">
        <h1>Tracker</h1>
        <p>
            This is Tracker
        </p>
    </div>
    
    
    
    

    </div>
  </template>
  
<style scoped>

.head-information-container h1 {
    font-size: 2rem !important;
}

.left-container {
    /* display: flex;
    flex-direction: column;
    align-items: flex-start; */
}

.timePicker {
    /* background-color: #ffffff; */
    /* color: #333; */
    /* border: 2px solid #000000;
    padding: 5px ;
    border-radius: 5px;*/
    height: 2rem;
}




.personal-location-container .location-icon{
    position: absolute;
    left: 9rem;
    width: 2rem !important;
    height: 2rem !important; 
}

.main-container{
    width: 100%;
    height: auto;
    background: white;
    /* padding: 2rem; */
    min-height: 100vh !important;
    display: flex;
    justify-content: center; 
    
    flex-direction: column;
    align-items: center;
    /* padding: 4rem 4rem 4rem 10%; */

   
    /* justify-content: flex-start; */
}
.img-container{
    max-width: 100%;
    height: auto;
}

.img-container img {
    width: 100%;
    height: auto; 
}








  .about {
    background: white;
    padding: 2rem;
  }
  
  .content {
    color: #333;
    text-align: center; 
    gap:0.5rem
  }



  
  @media (min-width: 1024px) {
    .about {
      min-height: 100vh;
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-start; 
      align-items: flex-start; 
      padding: 4rem 4rem 4rem 10%; 
    }
  
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1.5rem;
      text-align: left; 
    }

    p {
        color: #37447E;
    }
  
   
  }


.swiper-container {
    margin-top: 10rem;
    width: 100vw;
    height: 33.33vw;
    overflow: hidden;
    }

.swiper-slide {
    text-align: center;
    font-size: 18px;
    background: #fff;

    /* Center slide text vertically */
    display: -webkit-box;
    display: -ms-flexbox;
    display: -webkit-flex;
    display: flex;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    -webkit-box-align: center;
    -ms-flex-align: center;
    -webkit-align-items: center;
    align-items: center;
}

.swiper-slide img {
    display: block;
    width: 100%;
    /* height: 100%; */
    object-fit: cover;
}

.thinContainer {
    margin-left: 15%;
    margin-right: 15%;
    width: auto;
    display: flex;
    flex-direction: column; 
    align-items: center; 
    margin-top: 3rem;
}

.background-lightGreen {
    display: flex;
    justify-content: center;
    background-color: #e4f2ff;
    height: 26rem;
}



.introduceContainer {

width: 80%;
display: flex;
flex-direction: column; 
align-items: center; 
/* justify-content: center; */
height: 20rem; 
text-align: center; 
margin-top: 10rem;
}

.introduceContainer h1 {
    font-weight: bold;
}


.introduceContainer p {
    text-align: left;
    font-size: 25px
}

.mapContainer {
    width: 80%;
    height: 20rem;
    margin-top: 3rem;
    display: flex;
}

.mapContainer:hover {
    cursor: pointer; 
}

.trackerContainer {
    width: 80%;
    height: 20rem;
    margin-top: 3rem;
    display: flex;
    margin-bottom: 3rem;
}

.trackerContainer:hover {
    cursor: pointer; 
}

.routineContainer {
    width: 80%;
    height: 20rem;
    margin-top: 3rem;
    display: flex;
}

.routineContainer:hover {
    cursor: pointer; 
}


.describeContainer {
    width: 40%;
    height: auto;
    padding: 1rem;
}

.describeContainer h2 {
    display: flex;
    text-align: center; 
    justify-content: center;
    font-size: 25px;
    font-weight: bold;
}

.describeContainer h3 {
    
    font-size: 22px;
    /* font-weight: bold; */
}

.imgContainer {
    width: 60%;
    height: auto;
    border-radius: 20px;
    overflow: hidden;
}

.imgContainer img{
    height: 100%;
    object-fit: cover;
}

@media (prefers-color-scheme: dark) {
  .main-container {
    background: #121212;
    color: #e0e0e0;
  }

  .introduceContainer h1,
  .introduceContainer p,
  .describeContainer h2,
  .describeContainer h3,
  .content {
    color: #e0e0e0;
  }

  .about {
    background: #1e1e1e;
  }

  .trackerContainer,
  .mapContainer,
  .routineContainer {
    background-color: #1f1f1f;
    border: 1px solid #333;
  }

  .background-lightGreen {
    background-color: #1e3a3a; /* Muted greenish for dark mode */
  }

  .swiper-slide {
    background: #1e1e1e;
  }

  .imgContainer {
    border: 1px solid #444;
  }

  input,
  .timePicker {
    background-color: #2a2a2a;
    color: #e0e0e0;
    border: 1px solid #555;
  }
}

</style>