var currentStep = 0;

$(document).ready(function() {
  $("video").click(function(){
    $(this).attr('controls', 'controls');
  });
});

function initTutorial(){
 var CurrentVideo = document.getElementById('currentvideo');
 var playlist = document.getElementById('playlist');
 var tracks = playlist.getElementsByTagName('a');
 //CurrentVideo.volume = 0.10;
 //CurrentVideo.play();

 for(var track in tracks) {
   var link = tracks[track];
   if(typeof link === "function" || typeof link === "number") continue;

   link.addEventListener('click', function(e) {
     e.preventDefault();
     var video = this.getAttribute('href');
     run(video, CurrentVideo, this);
   });
 }

 CurrentVideo.addEventListener('ended',function(e) {
     for(var track in tracks) {
       var link = tracks[track];
       var nextTrack = parseInt(track) + 1;
       if(typeof link === "function" || typeof link === "number") continue;
       if(!this.src) this.src = tracks[0];
       if(track == (tracks.length - 1)) nextTrack = 0;
                               console.log(nextTrack);
       if(link.getAttribute('href') === this.src) {
         var nextLink = tracks[nextTrack];
         run(nextLink.getAttribute('href'), videoplaylist, nextLink);
         break;
       }
     }
 });

}

function run(video, video_el, link){
     var parent = link.parentElement;

     //quitar el active de todos los elementos de la lista
     var items = parent.parentElement.getElementsByTagName('li');
     for(var item in items) {
       if(items[item].classList)
         items[item].classList.remove("active");
     }

     //agregar active a este elemento
     parent.classList.add("active");

     //tocar la cancion
     video_el.src = video;
     //video_el.setAttribute('poster','step1.png');
     video_el.load();
     video_el.play();
     $("#videocontainer").fadeIn("slow");
}

function closeVideo(){
  $(".currentvideo").trigger('pause');
  $(".currentvideo").hide();
  $("#videocontainer").fadeOut("slow");
  $(".currentvideo").removeClass("currentvideo");
  currentStep = 0;
}

function Step1(){
  $('#video1').prop('currentTime', 0);
  $("#video1").fadeIn("slow");
  $("#video1").trigger('play');
  $("#video1").addClass("currentvideo");
  $("#videocontainer").fadeIn("slow");
  currentStep = 1;
  $('#currentIndex').attr('src', 'icons/number-1.svg');
}

function Step2(){
  $('#video2').prop('currentTime', 0);
  $("#video2").fadeIn("slow");
  $("#video2").trigger('play');
  $("#video2").addClass("currentvideo");
  $("#videocontainer").fadeIn("slow");
  currentStep = 2;
  $('#currentIndex').attr('src', 'icons/number-2.svg');
}

function Step3(){
  $('#video3').prop('currentTime', 0);
  $("#video3").fadeIn("slow");
  $("#video3").trigger('play');
  $("#video3").addClass("currentvideo");
  $("#videocontainer").fadeIn("slow");
  currentStep = 3;
  $('#currentIndex').attr('src', 'icons/number-3.svg');
}

function Step4(){
  $('#video4').prop('currentTime', 0);
  $("#video4").fadeIn("slow");
  $("#video4").trigger('play');
  $("#video4").addClass("currentvideo");
  $("#videocontainer").fadeIn("slow");
  currentStep = 4;
  //$("#next-button").fadeOut();
  $('#currentIndex').attr('src', 'icons/number-4.svg');
}

function prevStep(){
  $(".currentvideo").trigger('pause');
  $(".currentvideo").hide();
  $(".currentvideo").removeClass("currentvideo");
  switch(currentStep){
    case 1:
      closeVideo();
      break;
    case 2:
      Step1();
      break;
    case 3:
      Step2();
      break;
    case 4:
      Step3();
      break;
    default:
      closeVideo();
  }
}
function nextStep(){
  $(".currentvideo").trigger('pause');
  $(".currentvideo").hide();
  $(".currentvideo").removeClass("currentvideo");
  console.log("current step: " + currentStep);
  switch(currentStep){
    case 1:
      Step2();
      break;
    case 2:
      Step3();
      break;
    case 3:
      Step4();
      break;
    case 4:
      closeVideo();
      break;
    default:
      closeVideo();
  }
}
