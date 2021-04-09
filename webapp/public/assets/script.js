//selecting all required elements
const dropArea = document.querySelector(".drag-area"),
dragText = dropArea.querySelector("header"),
button = document.querySelector("button"),
input = dropArea.querySelector("input"),
icon = dropArea.querySelector(".icon"),
sensitive = document.querySelector(".sensitive"),
nonsensitive = document.querySelector(".non-sensitive"),
progressStatus = document.querySelector("#progressStatus"),
progressBar = document.querySelector("#progressBar");

toggle = document.querySelector(".toggle-button");
navlinks = document.querySelector(".navbar-links");

// Navbar toggle button
toggle.addEventListener('click', () => {
  navlinks.classList.toggle('active');
});

button.onclick = ()=>{
  input.click();
}

var loadFile = function(event) {
  var image = document.getElementById('output');
  const photo = event.target.files[0];
  if (photo !== undefined){
    dropArea.classList.add("active");
    sensitive.style.display = "none";
    nonsensitive.style.display = "none";
    progressStatus.style.display = "none";
    progressBar.style.display = "none";
    progressBar.style.width = '0%';
    progressBar.innerHTML = '0%';
    let fileType = photo.type; //getting selected file type
    let validExtensions = ["image/jpeg", "image/jpg", "image/png"]; //adding some valid image extensions in array
    
    if(validExtensions.includes(fileType)){
      const photoURL = URL.createObjectURL(photo);
      image.src = photoURL;
      image.style.display = "block";
      icon.style.display = "none";
      dragText.style.display = "none";
      progressStatus.style.display = "block";
      progressBar.style.display = "block";
      setTimeout(() => {
        classify();
      }, 150);
    }
    else{
      alert("This is not an Image File!");
      dropArea.classList.remove("active");
      dragText.style.display = "block";
      icon.style.display = "block";
      image.style.display = "none";
    }
  }
};

// Dark Mode toggle
const chk = document.getElementById('chk');
chk.addEventListener('change', () => {
  document.body.classList.toggle('dark');
});

const classify = async () => {
  var image = document.getElementById('output');
  imagePrediction = classifyImage(image);
  textPrediction = extractText(image)
                      .then((text) =>
                      {
                          return classifyText(text); 
                      });
  let image_conf = 0;
  let text_conf = 0;
  await imagePrediction.then((value) =>
      { 
          image_conf = value;
          console.log("Image confidence = ", value);
          for (let i = 0; i <= 50; i++) {
              progressBar.style.width = i + '%';
              progressBar.innerHTML = i + '%';
          }
      }
  );
  await textPrediction.then((value) =>
      { 
          text_conf = value;
          console.log("Text confidence = ", value);
      }
  );
  progressStatus.style.display = "none";
  progressBar.style.display = "none";
  if(image_conf > 0.5 || text_conf > 0.5){
      sensitive.style.display = "block";
      console.log("Sensitive");
  }
  else{
      nonsensitive.style.display = "block";
      console.log("Non-sensitive");
  }
}

const extractText = async function(image){
  let prgs = 0;
  let text = await Tesseract.recognize(
              image.src,
              'eng',
              { logger: (m)=> {
                  if(m.status === "recognizing text"){
                    prgs = 50 + Math.ceil(m.progress * 100)/2;
                    progressBar.style.width = prgs + '%';
                    progressBar.innerHTML = prgs + '%';
                  }              
                }
              }
              ).then(({ data: { text } }) => {
                  return text;
              });
  text = text.replace(/[\r\n]+/g," ");
  console.log("Length of text:" , text.length);
  return text;
}

const classifyImage = async function(image){
  let tensor = tf.browser.fromPixels(image)
              .resizeBilinear([150, 150])
              .div(tf.scalar(255))
              .expandDims(0);
  
  const classification = await image_model
                      .predict(tensor)
                      .data()
                      .then((value) => 
                          { return value; }
                      );
  return classification;
}

const classifyText = async function(text){
  const max_length = 60;
  const tokens = text.split(" ");
  const word_index = await fetch('./models/text_model/word_index.json')
              .then(response => {
              return response.json();
              });
  let padded = new Array(max_length).fill(0);
  for (let i = 0; i < max_length; i++) {
      let tokenid = word_index[tokens[i].toLowerCase()]
      padded[i] = (tokenid === undefined)? 1 : tokenid;
      if(i == tokens.length-1)
          break;
  }
  let tensor = tf.tensor([padded]);
  
  const classification = await text_model
                          .predict(tensor)
                          .data()
                          .then( (value) => 
                          { return value; }
                          );
  return classification;
}



const setupPage = async() => {
  text_model = await tf.loadLayersModel('./models/text_model/model.json');
  image_model = await tf.loadLayersModel('./models/image_model/model.json')
}

setupPage();
