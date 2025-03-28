let imagemOriginal = null; // Imagem atualmente selecionada
let imagensCarregadas = []; // Armazena { img, nomeArquivo, extension, fileSize }
let imagemSelecionadaIndex = 0;

const dropArea = document.getElementById("drop-area");
const uploadInput = document.getElementById("upload");
const effectValue = document.getElementById("effect-value");
const effectRange = document.getElementById("effect-range");
const qualityRange = document.getElementById("quality-range");
const qualityValue = document.getElementById("quality-value");
const effectType = document.getElementById("effect");

// Eventos de drag & drop e clique
dropArea.addEventListener("click", () => uploadInput.click());
dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropArea.classList.add("bg-light");
});
dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("bg-light");
});
dropArea.addEventListener("drop", (event) => {
    event.preventDefault();
    dropArea.classList.remove("bg-light");
    if (event.dataTransfer.files.length) {
        carregarImagens(event.dataTransfer.files);
    }
});
uploadInput.addEventListener("change", (event) => {
    if (event.target.files.length) {
        carregarImagens(event.target.files);
    }
});

// Atualiza a qualidade e redesenha as pré-visualizações
qualityRange.addEventListener("input", () => {
    qualityValue.textContent = qualityRange.value;
    if (imagemOriginal) {
        const { extension } = imagensCarregadas[imagemSelecionadaIndex];
        desenharImagemComQualidade(imagemOriginal, extension);
        aplicarEfeito();
    }
    atualizarDownloadTamanhos(document.getElementById("original-canvas"), "original");
    atualizarDownloadTamanhos(document.getElementById("effect-canvas"), "effect");
});

function carregarImagens(files) {
    imagensCarregadas = [];
    document.getElementById("thumbnail-container").innerHTML = "";
    const filesArray = Array.from(files);
    filesArray.forEach((file) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const nomeArquivo = file.name.split(".").slice(0, -1).join(".");
                const extension = file.name.split(".").pop();
                const fileSize = file.size;
                imagensCarregadas.push({ img, nomeArquivo, extension, fileSize });
                atualizarThumbnails();
                if (imagensCarregadas.length === 1) {
                    selecionarImagem(0);
                }
                updateDownloadAllSectionVisibility();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function atualizarThumbnails() {
    const thumbnailContainer = document.getElementById("thumbnail-container");
    thumbnailContainer.innerHTML = "";
    imagensCarregadas.forEach((item, index) => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("position-relative", "d-inline-block");
        const thumbImg = document.createElement("img");
        thumbImg.src = item.img.src;
        thumbImg.classList.add("thumbnail");
        if (index === imagemSelecionadaIndex) {
            thumbImg.classList.add("selected");
        }
        thumbImg.addEventListener("click", () => {
            selecionarImagem(index);
        });
        wrapper.appendChild(thumbImg);
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "X";
        deleteBtn.classList.add("delete-btn");
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            excluirImagem(index);
        });
        wrapper.appendChild(deleteBtn);
        thumbnailContainer.appendChild(wrapper);
    });
}

function selecionarImagem(index) {
    imagemSelecionadaIndex = index;
    const thumbnails = document.querySelectorAll(".thumbnail");
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle("selected", i === index);
    });
    const { img, fileSize, extension } = imagensCarregadas[index];
    imagemOriginal = img;
    document.getElementById("original-title").textContent =
        `Imagem Original (${formatFileSize(fileSize)}, ${extension})`;
    desenharImagemComQualidade(img, extension);
    aplicarEfeito();
}

function excluirImagem(index) {
    imagensCarregadas.splice(index, 1);
    if (imagensCarregadas.length > 0) {
        if (imagemSelecionadaIndex >= imagensCarregadas.length) {
            imagemSelecionadaIndex = 0;
        }
        selecionarImagem(imagemSelecionadaIndex);
    } else {
        imagemOriginal = null;
        imagemSelecionadaIndex = 0;
        limparCanvases();
    }
    atualizarThumbnails();
    updateDownloadAllSectionVisibility();
}

function limparCanvases() {
    const originalCanvas = document.getElementById("original-canvas");
    const effectCanvas = document.getElementById("effect-canvas");
    const originalCtx = originalCanvas.getContext("2d");
    const effectCtx = effectCanvas.getContext("2d");
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
}

// Desenha a imagem original considerando a qualidade definida
function desenharImagemComQualidade(img, extension) {
    const canvas = document.getElementById("original-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (["png", "webp", "svg"].includes(extension.toLowerCase())) {
        ctx.drawImage(img, 0, 0, img.width, img.height);
        atualizarDownloadTamanhos(canvas, "original");
    } else {
        const quality = qualityRange ? qualityRange.value / 100 : 1;
        const offscreen = document.createElement("canvas");
        offscreen.width = img.width;
        offscreen.height = img.height;
        const offCtx = offscreen.getContext("2d");
        offCtx.drawImage(img, 0, 0, img.width, img.height);
        const dataUrl = offscreen.toDataURL("image/jpeg", quality);
        const newImg = new Image();
        newImg.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(newImg, 0, 0, canvas.width, canvas.height);
            atualizarDownloadTamanhos(canvas, "original");
        };
        newImg.src = dataUrl;
    }
}

// Aplica o efeito selecionado à imagem e atualiza o canvas da segunda coluna
function aplicarEfeito() {
    if (!imagemOriginal) return;
    const canvas = document.getElementById("effect-canvas");
    const ctx = canvas.getContext("2d");
    const efeitoSelecionado = effectType.value;
    const nivel = parseInt(effectRange.value);
    canvas.width = imagemOriginal.width;
    canvas.height = imagemOriginal.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (efeitoSelecionado === "pixel") {
        pixelarImagem(ctx, canvas, nivel);
    } else if (efeitoSelecionado === "blur") {
        blurarImagem(ctx, canvas, nivel);
    } else if (efeitoSelecionado === "pixelGray") {
        pixelarCinzaImagem(ctx, canvas, nivel);
    } else if (efeitoSelecionado === "blurGray") {
        blurCinzaImagem(ctx, canvas, nivel);
    }
    atualizarDownloadTamanhos(canvas, "effect");
}

function pixelarImagem(ctx, canvas, tamanhoPixel) {
    const width = canvas.width;
    const height = canvas.height;
    ctx.drawImage(imagemOriginal, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let y = 0; y < height; y += tamanhoPixel) {
        for (let x = 0; x < width; x += tamanhoPixel) {
            const index = (y * width + x) * 4;
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            const alpha = data[index + 3];
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
            ctx.fillRect(x, y, tamanhoPixel, tamanhoPixel);
        }
    }
}

function blurarImagem(ctx, canvas, blurLevel) {
    ctx.filter = `blur(${blurLevel / 10}px)`;
    ctx.drawImage(imagemOriginal, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
}

function pixelarCinzaImagem(ctx, canvas, tamanhoPixel) {
    pixelarImagem(ctx, canvas, tamanhoPixel);
    let pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let pdata = pixelData.data;
    for (let i = 0; i < pdata.length; i += 4) {
        const gray = 0.3 * pdata[i] + 0.59 * pdata[i + 1] + 0.11 * pdata[i + 2];
        pdata[i] = gray;
        pdata[i + 1] = gray;
        pdata[i + 2] = gray;
    }
    ctx.putImageData(pixelData, 0, 0);
}

function blurCinzaImagem(ctx, canvas, blurLevel) {
    ctx.filter = `blur(${blurLevel / 10}px)`;
    ctx.drawImage(imagemOriginal, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    let pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = pixelData.data;
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    ctx.putImageData(pixelData, 0, 0);
}

function atualizarDownloadTamanhos(canvas, prefix) {
    const quality = qualityRange ? qualityRange.value / 100 : 1;
    ["png", "jpeg", "webp"].forEach(format => {
        const mimeType = (format === "jpeg") ? "image/jpeg" : "image/" + format;
        const qualityParam = (format === "png") ? undefined : quality;
        canvas.toBlob(blob => {
            document.getElementById(prefix + '-' + format + '-size').textContent = formatFileSize(blob.size);
        }, mimeType, qualityParam);
    });
}

function baixarImagem(format, efeito) {
    const canvas = efeito
        ? document.getElementById("effect-canvas")
        : document.getElementById("original-canvas");
    const { nomeArquivo } = imagensCarregadas[imagemSelecionadaIndex];
    const quality = qualityRange ? qualityRange.value / 100 : 1;
    const filename = efeito
        ? `${nomeArquivo}.${format}.blur.${format}`
        : `${nomeArquivo}.${format}`;
    const link = document.createElement("a");
    if (format === "webp") {
        link.href = canvas.toDataURL("image/webp", quality);
    } else {
        link.href = canvas.toDataURL(`image/${format}`, quality);
    }
    link.download = filename;
    link.click();
}

// FUNÇÕES PARA "BAIXAR TODAS AS IMAGENS"
function downloadImage(dataUrl, filename) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function processImagemOriginal(imageObj, format) {
    const img = imageObj.img;
    const extension = imageObj.extension;
    const quality = qualityRange ? qualityRange.value / 100 : 1;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (["png", "webp", "svg"].includes(extension.toLowerCase())) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    const mimeType = (format === "jpeg") ? "image/jpeg" : "image/" + format;
    return canvas.toDataURL(mimeType, (format === "png" ? 1 : quality));
}

function aplicarEfeitoNaImagem(img, effectTypeValue, effectLevel) {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (effectTypeValue === "pixel") {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let y = 0; y < canvas.height; y += effectLevel) {
            for (let x = 0; x < canvas.width; x += effectLevel) {
                const index = (y * canvas.width + x) * 4;
                const red = data[index];
                const green = data[index + 1];
                const blue = data[index + 2];
                const alpha = data[index + 3];
                ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
                ctx.fillRect(x, y, effectLevel, effectLevel);
            }
        }
    } else if (effectTypeValue === "blur") {
        ctx.filter = `blur(${effectLevel / 10}px)`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
    } else if (effectTypeValue === "pixelGray") {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let y = 0; y < canvas.height; y += effectLevel) {
            for (let x = 0; x < canvas.width; x += effectLevel) {
                const index = (y * canvas.width + x) * 4;
                const red = data[index];
                const green = data[index + 1];
                const blue = data[index + 2];
                const alpha = data[index + 3];
                ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
                ctx.fillRect(x, y, effectLevel, effectLevel);
            }
        }
        let pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let pdata = pixelData.data;
        for (let i = 0; i < pdata.length; i += 4) {
            const gray = 0.3 * pdata[i] + 0.59 * pdata[i + 1] + 0.11 * pdata[i + 2];
            pdata[i] = gray;
            pdata[i + 1] = gray;
            pdata[i + 2] = gray;
        }
        ctx.putImageData(pixelData, 0, 0);
    } else if (effectTypeValue === "blurGray") {
        ctx.filter = `blur(${effectLevel / 10}px)`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
        let pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = pixelData.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }
        ctx.putImageData(pixelData, 0, 0);
    }
    return canvas;
}

function processImagemModificada(imageObj, format) {
    const img = imageObj.img;
    const quality = qualityRange ? qualityRange.value / 100 : 1;
    const effectTypeValue = effectType.value;
    const effectLevel = parseInt(effectRange.value);
    const canvas = aplicarEfeitoNaImagem(img, effectTypeValue, effectLevel);
    const mimeType = (format === "jpeg") ? "image/jpeg" : "image/" + format;
    return canvas.toDataURL(mimeType, (format === "png" ? 1 : quality));
}

function baixarTodasImagens(format, efeito) {
    imagensCarregadas.forEach((imageObj) => {
        let dataUrl;
        if (efeito) {
            dataUrl = processImagemModificada(imageObj, format);
        } else {
            dataUrl = processImagemOriginal(imageObj, format);
        }
        const filename = efeito
            ? `${imageObj.nomeArquivo}.${format}.blur.${format}`
            : `${imageObj.nomeArquivo}.${format}`;
        downloadImage(dataUrl, filename);
    });
}

function updateDownloadAllSectionVisibility() {
    const downloadAllSection = document.getElementById("download-all-section");
    if (imagensCarregadas.length > 1) {
        downloadAllSection.style.display = "block";
    } else {
        downloadAllSection.style.display = "none";
    }
}

function formatFileSize(bytes) {
    return (bytes / 1024).toFixed(2) + " KB";
}

effectRange.addEventListener("input", () => {
    effectValue.textContent = effectRange.value;
    aplicarEfeito();
});

effectType.addEventListener("change", aplicarEfeito);
