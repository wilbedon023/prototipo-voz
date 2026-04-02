// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.static('public'));

// Endpoint para transcribir audio
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
        const audioFile = req.file;
        const audioData = fs.readFileSync(audioFile.path);
        
        // ✅ CAMBIO IMPORTANTE #1: Agregué los parámetros 'model' y 'language'
        // Ahora Deepgram SABE que tiene que usar el modelo correcto y escuchar en español
        const response = await axios({
            method: 'post',
            url: 'https://api.deepgram.com/v1/listen?model=nova-2&language=es', // <--- Línea clave
            headers: {
                'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
                'Content-Type': 'audio/wav' // Le decimos que es un archivo WAV solamente
            },
            data: audioData
        });
        
        // Limpiar archivo temporal
        fs.unlinkSync(audioFile.path);
        
        const transcript = response.data.results.channels[0].alternatives[0].transcript;
        
        // ✅ CAMBIO IMPORTANTE #2: Si el transcript está vacío, devolvemos un mensaje útil
        if (!transcript || transcript.trim() === '') {
            return res.json({ 
                success: true, 
                text: '(No se detectó voz. ¿Hablaste lo suficientemente cerca del micrófono?)' 
            });
        }
        
        res.json({ success: true, text: transcript });
        
    } catch (error) {
        console.error('Error detallado:', error.response?.data || error.message);
        
        // ✅ Mejoramos el mensaje de error para que sepas qué pasó
        let mensajeError = 'Error al transcribir';
        if (error.response?.status === 401) {
            mensajeError = 'Error de autenticación: Revisa tu API Key de Deepgram';
        } else if (error.response?.status === 402) {
            mensajeError = 'Créditos insuficientes en Deepgram';
        } else if (error.response?.data?.err_msg) {
            mensajeError = error.response.data.err_msg;
        }
        
        res.status(500).json({ success: false, error: mensajeError });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📌 Asegúrate de que tu API Key de Deepgram esté en el archivo .env`);
});