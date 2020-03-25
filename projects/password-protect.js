$( document ).ready(function() {
  // Handler for .ready() called.

  $("#pw-input").on('input', function(){
    checkPW($(this).val());
  });

});

function checkPW(text){
  console.log("checking pw");

  if (text == "lemonade"){
    console.log("password correct");
    $(".skrim").fadeOut('slow');
    $("#pw-box").fadeOut('slow');
  }
}
