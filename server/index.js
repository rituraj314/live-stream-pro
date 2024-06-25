import http from 'http'
import path from 'path'
import { spawn } from 'child_process'
import express from 'express'
import { Server } from 'socket.io'
import fs from 'fs'

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

// Ensure the output directory exists
const outputDir = './streams'
if(fs.existsSync(outputDir)){
    fs.rmSync(outputDir, { recursive: true, force: true });
}
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
}

const options = [
    '-i', '-',
    '-filter_complex',
    '[v:0]split=3[v1][v2][v3]; [a:0]asplit=3[a1][a2][a3]',
    // High quality stream
    '-map', '[v1]', '-map', '[a1]', 
    '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3000k', '-maxrate', '3000k', '-bufsize', '6000k',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-f', 'hls', '-hls_time', '4', '-hls_list_size', '10', '-hls_flags', 'delete_segments',
    path.join(outputDir, 'high.m3u8'),
    // Medium quality stream
    '-map', '[v2]', '-map', '[a2]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '1500k', '-maxrate', '1500k', '-bufsize', '3000k',
    '-c:a', 'aac', '-b:a', '96k', '-ar', '44100',
    '-f', 'hls', '-hls_time', '4', '-hls_list_size', '10', '-hls_flags', 'delete_segments',
    path.join(outputDir, 'medium.m3u8'),
    // Low quality stream
    '-map', '[v3]', '-map', '[a3]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '800k', '-maxrate', '800k', '-bufsize', '1600k',
    '-c:a', 'aac', '-b:a', '64k', '-ar', '22050',
    '-f', 'hls', '-hls_time', '4', '-hls_list_size', '10', '-hls_flags', 'delete_segments',
    path.join(outputDir, 'low.m3u8')
];

const ffmpegProcess = spawn('ffmpeg', options);

ffmpegProcess.stdout.on('data', (data) => {
    console.log(`ffmpeg stdout: ${data}`);
});

ffmpegProcess.stderr.on('data', (data) => {
    console.error(`ffmpeg stderr: ${data}`);
});

ffmpegProcess.on('close', (code) => {
    console.log(`ffmpeg process exited with code ${code}`);
});

app.use(express.static(path.resolve('./public')))
app.use('/streams', express.static(path.resolve('./streams')))

io.on('connection', socket => {
    console.log('Socket Connected', socket.id);
    socket.on('binarystream', stream => {
        console.log('Binary Stream Incoming...')
        ffmpegProcess.stdin.write(stream)
    })
})

server.listen(4000, () => console.log(`HTTP Server is running on PORT 4000`))

// Generate master playlist
const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=3128000,RESOLUTION=1280x720
high.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1628000,RESOLUTION=854x480
medium.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=864000,RESOLUTION=640x360
low.m3u8`;

fs.writeFileSync(path.join(outputDir, 'playlist.m3u8'), masterPlaylist);