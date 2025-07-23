<script setup>
import InputText from 'primevue/inputtext';
import 'primeicons/primeicons.css';
import { ref, onMounted } from 'vue';


</script>




<template>
    

    <div class="main-container">
        
    
    <div class="introduceContainer">
        <h1>Routine</h1>
        <p>
            This is Routine Page
        </p>
    </div>
    
    
    

    </div>
  </template>
  
<style scoped>

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

  .about {
    background: white;
    padding: 2rem;
  }
  
  .content {
    color: #333;
    text-align: center; 
    gap:0.5rem
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



</style>