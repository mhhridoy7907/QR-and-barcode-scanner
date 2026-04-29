let mode = "qr";

function setMode(m){
    mode = m;

    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    event.target.classList.add("active");

    document.getElementById("result").innerText = "Mode: " + m.toUpperCase();
}

document.getElementById("fileInput").addEventListener("change", function(e){
    let file = e.target.files[0];
    if(!file) return;

    let reader = new FileReader();

    reader.onload = function(){
        let img = document.getElementById("preview");
        img.src = reader.result;
        img.style.display = "block";

        img.dataset.src = reader.result;
    }

    reader.readAsDataURL(file);
});

function scanNow(){
    let imgSrc = document.getElementById("preview").dataset.src;
    if(!imgSrc){
        alert("Please upload image first");
        return;
    }

    let img = new Image();
    img.src = imgSrc;

    img.onload = function(){

        let canvas = document.getElementById("canvas");
        let ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img,0,0);

        let imageData = ctx.getImageData(0,0,canvas.width,canvas.height);

        if(mode === "qr"){

            let qr = jsQR(imageData.data, canvas.width, canvas.height);

            if(qr){
                show(" QR: " + qr.data);
            }else{
                show("❌ QR not found");
            }

        } else {

            Quagga.decodeSingle({
                src: imgSrc,
                numOfWorkers: 0,
                decoder: {
                    readers: ["code_128_reader","ean_reader","ean_8_reader","code_39_reader"]
                }
            }, function(res){
                if(res && res.codeResult){
                    show(" BARCODE: " + res.codeResult.code);
                } else {
                    show("❌ Barcode not found");
                }
            });

        }
    }
}

function show(text){
    let box = document.getElementById("result");
    box.innerHTML = text;

    if(text.includes("http")){
        box.innerHTML += `<br><a href="${text.split(": ")[1]}" target="_blank">Open Link</a>`;
    }
}

