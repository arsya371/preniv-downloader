const fs = require('fs');
const path = require('path');
const os = require('os');
const Function = require('./module/function');
const { green, blueBright, greenBright, redBright, cyan, yellow } = require('chalk')

class VideoDownloader {
    constructor() {
        this.api = new Function();
        this.isTermux = this.detectTermux();
        this.defaultDownloadPath = this.getDefaultDownloadPath();
    }
	
    detectTermux() {
        return process.env.PREFIX && process.env.PREFIX.includes('com.termux') ||
               process.env.TERMUX_VERSION ||
               fs.existsSync('/data/data/com.termux');
    }

    getDefaultDownloadPath() {
        if (this.isTermux) {
            const termuxPaths = [
                '/data/data/com.termux/files/home/storage/downloads',
                '/data/data/com.termux/files/home/downloads',
                '/sdcard/Download',
                path.join(os.homedir(), 'downloads')
            ];
            
            for (const dir of termuxPaths) {
                try {
                    if (fs.existsSync(dir)) {
                        return dir;
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        return './downloads';
    }

    createDirectory(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { 
                recursive: true,
                mode: this.isTermux ? 0o755 : 0o777
            });
            
            if (this.isTermux) {
                console.log(green(`📁 Direktori dibuat: ${dir}`));
            }
        }
    }

    async downloadFile(url, filepath, filename) {
        try {
            const response = await this.api.downloadStream(url);
            const totalSize = parseInt(response.headers['content-length'] || 0);
            let downloadedSize = 0;

            const fileStream = fs.createWriteStream(filepath, {
                mode: this.isTermux ? 0o644 : 0o666
            });
            
            response.data.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (totalSize > 0) {
                    const percentage = Math.round((downloadedSize / totalSize) * 100);
                    const downloaded = this.api.formatFileSize(downloadedSize);
                    const total = this.api.formatFileSize(totalSize);
                    
                    const progressBar = this.createProgressBar(percentage);
                    process.stdout.write(`\r⬇️  ${filename}: ${progressBar} ${percentage}% (${downloaded}/${total})`);
                } else {
                    const downloaded = this.api.formatFileSize(downloadedSize);
                    process.stdout.write(`\r⬇️  ${filename}: ${downloaded}`);
                }
            });

            return new Promise((resolve, reject) => {
                response.data.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    if (this.isTermux) {
                        console.log(green(`\n📂 Lokasi: ${filepath}`));
                    }
                    resolve(filepath);
                });

                fileStream.on('error', (error) => {
                    fs.unlink(filepath, () => {});
                    reject(error);
                });

                response.data.on('error', (error) => {
                    reject(error);
                });
            });
        } catch (error) {
            console.log(redBright(`Error downloading file: ${error.message}`));
            throw error;
        }
    }

    createProgressBar(percentage) {
        const width = 20;
        const filled = Math.round(width * percentage / 100);
        const empty = width - filled;
        return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
    }

    async downloadTikTokVideo(videoInfo, outputDir = null, quality = 'hd') {
        try {
            outputDir = outputDir || this.defaultDownloadPath;
            this.createDirectory(outputDir);

            const { data } = videoInfo;
            
            this.api.displayVideoInfo(videoInfo, 'tiktok');

            console.log(blueBright('\n🎥 Opsi Download Video:'));
            data.download.video.forEach((url, index) => {
                console.log(blueBright(`${index + 1}. Video ${index === 1 ? '(HD)' : index === 0 ? '(Normal)' : `(${index + 1})`}`));
            });

            let videoUrl;
            if (quality === 'hd' && data.download.video.length > 1) {
                videoUrl = data.download.video[1];
            } else {
                videoUrl = data.download.video[0];
            }

            const filename = this.api.generateFilename(videoInfo, quality, 'video', 'tiktok');
            const videoFilename = `${filename}.mp4`;
            const videoPath = path.join(outputDir, videoFilename);

            await this.downloadFile(videoUrl, videoPath, videoFilename);

            return {
                videoPath,
                audioUrl: data.download.audio,
                filename: this.api.generateFilename(videoInfo, 'normal', 'base', 'tiktok')
            };

        } catch (error) {
            console.log(redBright(`Error downloading TikTok video: ${error.message}`));
            throw error;
        }
    }

    async downloadFacebookVideo(videoInfo, outputDir = null, quality = 'hd') {
        try {
            outputDir = outputDir || this.defaultDownloadPath;
            this.createDirectory(outputDir);

            const { data } = videoInfo;
            
            this.api.displayVideoInfo(videoInfo, 'facebook');

            console.log(blueBright('\n🎥 Opsi Download Video:'));
            data.forEach((video, index) => {
                console.log(blueBright(`${index + 1}. Video ${video.resolution} (${video.format})`));
            });

            let selectedVideo;
            if (quality === 'hd') {
                selectedVideo = data.find(v => v.resolution.includes('720p') || v.resolution.includes('HD')) || data[0];
            } else {
                selectedVideo = data[0];
            }

            const filename = this.api.generateFilename(videoInfo, quality, 'video', 'facebook');
            const videoFilename = `${filename}.mp4`;
            const videoPath = path.join(outputDir, videoFilename);

            await this.downloadFile(selectedVideo.url, videoPath, videoFilename);

            return {
                videoPath,
                audioUrl: null,
                filename: this.api.generateFilename(videoInfo, 'normal', 'base', 'facebook')
            };

        } catch (error) {
            console.log(redBright(`Error downloading Facebook video: ${error.message}`));
            throw error;
        }
    }

    async downloadYouTubeMP4Video(videoInfo, outputDir = null, quality = 'hd') {
        try {
            outputDir = outputDir || this.defaultDownloadPath;
            this.createDirectory(outputDir);

            const { data } = videoInfo;
            
            this.api.displayVideoInfo(videoInfo, 'ytmp4');

            console.log(blueBright('\n🎥 Opsi Download Video:'));
            console.log(blueBright(`1. Video MP4 (${data.title})`));

            const filename = this.api.generateFilename(videoInfo, quality, 'video', 'ytmp4');
            const videoFilename = `${filename}.mp4`;
            const videoPath = path.join(outputDir, videoFilename);

            await this.downloadFile(data.url, videoPath, videoFilename);

            return {
                videoPath,
                audioUrl: null,
                filename: this.api.generateFilename(videoInfo, 'normal', 'base', 'ytmp4')
            };

        } catch (error) {
            console.log(redBright(`Error downloading YouTube MP4 video: ${error.message}`));
            throw error;
        }
    }

    async downloadYouTubeMP3Audio(videoInfo, outputDir = null) {
        try {
            outputDir = outputDir || this.defaultDownloadPath;
            this.createDirectory(outputDir);

            const { result } = videoInfo;
            
            this.api.displayVideoInfo(videoInfo, 'ytmp3');

            console.log(blueBright('\n🎵 Opsi Download Audio:'));
            console.log(blueBright(`1. Audio MP3 (${result.title})`));

            const filename = this.api.generateFilename(videoInfo, 'normal', 'audio', 'ytmp3');
            const audioFilename = `${filename}.mp3`;
            const audioPath = path.join(outputDir, audioFilename);

            await this.downloadFile(result.audio_url, audioPath, audioFilename);

            return {
                videoPath: null,
                audioPath,
                filename: this.api.generateFilename(videoInfo, 'normal', 'base', 'ytmp3')
            };

        } catch (error) {
            console.log(redBright(`Error downloading YouTube MP3 audio: ${error.message}`));
            throw error;
        }
    }

    async downloadAudio(audioUrl, outputDir, filename) {
        try {
            const audioFilename = `${filename}_audio.mp3`;
            const audioPath = path.join(outputDir, audioFilename);

            await this.downloadFile(audioUrl, audioPath, audioFilename);
            return audioPath;
        } catch (error) {
            console.log(redBright(`Error downloading audio: ${error.message}`));
            throw error;
        }
    }

    async downloadAll(videoInfo, outputDir = null, quality = 'hd', platform = 'tiktok') {
        try {
            outputDir = outputDir || this.defaultDownloadPath;
            let result;
            
            if (platform === 'tiktok') {
                result = await this.downloadTikTokVideo(videoInfo, outputDir, quality);
                
                if (result.audioUrl) {
                    const audioPath = await this.downloadAudio(
                        result.audioUrl,
                        outputDir,
                        result.filename
                    );
                    
                    return {
                        videoPath: result.videoPath,
                        audioPath: audioPath
                    };
                }
            } else if (platform === 'facebook') {
                result = await this.downloadFacebookVideo(videoInfo, outputDir, quality);
                
                return {
                    videoPath: result.videoPath,
                    audioPath: null 
                };
            } else if (platform === 'ytmp4') {
                result = await this.downloadYouTubeMP4Video(videoInfo, outputDir, quality);
                
                return {
                    videoPath: result.videoPath,
                    audioPath: null
                };
            } else if (platform === 'ytmp3') {
                result = await this.downloadYouTubeMP3Audio(videoInfo, outputDir);
                
                return {
                    videoPath: null,
                    audioPath: result.audioPath
                };
            }
            
            return result;
        } catch (error) {
            console.log(redBright(`Error downloading all: ${error.message}`));
            throw error;
        }
    }

    showHelp() {
        console.log(`
   ${redBright(' █▀▄ █▀▄ ██▀ █▄ █ █ █ █')}
   ${redBright(' █▀  █▀▄ █▄▄ █ ▀█ █ ▀▄▀')} 

   ${'\x1b[37m'} █▀▄ ▄▀▄ █   █ █▄ █ █   ▄▀▄ ▄▀▄ █▀▄ ██▀ █▀▄${'\x1b[0m'}
   ${'\x1b[37m'} █▄▀ ▀▄▀ ▀▄▀▄▀ █ ▀█ █▄▄ ▀▄▀ █▀█ █▄▀ █▄▄ █▀▄${'\x1b[0m'}

   ${yellow('Multi-Platform Video Downloader')}
   ${greenBright('Github : https://github.com/arsya371/preniv-downloader')}`);
        
        console.log(`
Usage:
  node index.js [options] <video_url>

Options:
  -p, --platform <name>   Platform: tiktok, facebook, ytmp4, ytmp3 (auto-detect if not specified)
  -o, --output <dir>      Output directory (default: ${this.defaultDownloadPath})
  -q, --quality <type>    Video quality: normal, hd (default: hd)
  -a, --audio-only        Download audio only (TikTok/YouTube only)
  -v, --video-only        Download video only
  -i, --info              Show video info only
  -h, --help              Show this help

Examples:
  node index.js https://www.tiktok.com/@user/video/1234567890
  node index.js https://facebook.com/watch/?v=1234567890
  node index.js https://www.youtube.com/watch?v=dQw4w9WgXcQ
  node index.js -p ytmp3 https://www.youtube.com/watch?v=dQw4w9WgXcQ
  node index.js -o /sdcard/Download -q hd https://tiktok.com/...
  node index.js --audio-only https://tiktok.com/...
  node index.js --info https://facebook.com/...

${blueBright('🎥 Supported Platforms:\n  • TikTok (tiktok.com, vm.tiktok.com)\n  • Facebook (facebook.com, fb.watch)\n  • YouTube MP4 (youtube.com, youtu.be) - Video\n  • YouTube MP3 (youtube.com, youtu.be) - Audio')}

${this.isTermux ? yellow(`
Termux Setup:
  1. pkg install nodejs
  2. npm install
  3. termux-setup-storage (untuk akses storage)
  
Storage Access:
  Default download path: ${this.defaultDownloadPath}
  
Note: Pastikan storage permission sudah diaktifkan!
`) : (`
Dependencies:
  ${yellow('npm install')}
	`)}
        `);
    }

    checkTermuxPermissions() {
        if (this.isTermux) {
            const storagePath = '/data/data/com.termux/files/home/storage';
            if (!fs.existsSync(storagePath)) {
                console.log(redBright('⚠️  Storage belum di-setup!'));
                console.log(blueBright('💡 Jalankan: termux-setup-storage'));
                return false;
            }
        }
        return true;
    }
}

function parseArgs() {
    const args = process.argv.slice(2);
    const downloader = new VideoDownloader();
    
    const options = {
        platform: null,
        output: downloader.defaultDownloadPath,
        quality: 'hd',
        audioOnly: false,
        videoOnly: false,
        infoOnly: false,
        url: null
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '-p':
            case '--platform':
                options.platform = args[++i];
                break;
            case '-o':
            case '--output':
                options.output = args[++i];
                break;
            case '-q':
            case '--quality':
                options.quality = args[++i];
                break;
            case '-a':
            case '--audio-only':
                options.audioOnly = true;
                break;
            case '-v':
            case '--video-only':
                options.videoOnly = true;
                break;
            case '-i':
            case '--info':
                options.infoOnly = true;
                break;
            case '-h':
            case '--help':
                return { showHelp: true };
            default:
                if (!arg.startsWith('-')) {
                    options.url = arg;
                }
                break;
        }
    }

    return options;
}

function detectPlatform(url) {
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) {
        return 'tiktok';
    } else if (url.includes('facebook.com') || url.includes('fb.watch')) {
        return 'facebook';
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'ytmp4'; 
    }
    return 'unknown';
}

async function main() {
    const options = parseArgs();
    const downloader = new VideoDownloader();

    if (downloader.isTermux) {
        if (!downloader.checkTermuxPermissions()) {
            process.exit(1);
        }
    }

    if (options.showHelp) {
        downloader.showHelp();
        return;
    }
    
    if (!options.url) {
        console.log('\n💡 Contoh penggunaan:');
        console.log('node index.js https://www.tiktok.com/@user/video/1234567890');
        console.log('node index.js https://facebook.com/watch/?v=1234567890');
        console.log('node index.js https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        console.log('node index.js -p ytmp3 https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        downloader.showHelp();
        process.exit(1);
    }

    try {
        console.log(`
   ${redBright(' █▀▄ █▀▄ ██▀ █▄ █ █ █ █')}
   ${redBright(' █▀  █▀▄ █▄▄ █ ▀█ █ ▀▄▀')} 

   ${'\x1b[37m'} █▀▄ ▄▀▄ █   █ █▄ █ █   ▄▀▄ ▄▀▄ █▀▄ ██▀ █▀▄${'\x1b[0m'}
   ${'\x1b[37m'} █▄▀ ▀▄▀ ▀▄▀▄▀ █ ▀█ █▄▄ ▀▄▀ █▀█ █▄▀ █▄▄ █▀▄${'\x1b[0m'}

   ${yellow('Multi-Platform Video Downloader')}
   ${greenBright('Github : https://github.com/arsya371/preniv-downloader')}
   
`);

        let platform = options.platform || detectPlatform(options.url);
        
        if (options.audioOnly && (platform === 'ytmp4' || (options.url.includes('youtube.com') || options.url.includes('youtu.be')))) {
            platform = 'ytmp3';
        }
        
        if (platform === 'unknown') {
            console.error(redBright('❌ Error: Platform tidak didukung!'));
            console.log('💡 Platform yang didukung: TikTok, Facebook, YouTube');
            process.exit(1);
        }

        console.log(green.bold(`🔍 Platform terdeteksi: ${platform.toUpperCase()}`));

        const videoInfo = await downloader.api.getVideoInfo(options.url, platform);

        if (options.infoOnly) {
            downloader.api.displayVideoInfo(videoInfo, platform);
            return;
        }

        if (options.audioOnly) {
            if (platform === 'tiktok') {
                console.log(green.bold('\n🎵 Mode: Audio saja (TikTok)'));
                const filename = downloader.api.generateFilename(videoInfo, 'normal', 'base', platform);
                
                if (videoInfo.data.download && videoInfo.data.download.audio) {
                    const audioPath = await downloader.downloadAudio(
                        videoInfo.data.download.audio,
                        options.output,
                        filename
                    );
                    console.log(green.bold(`\n🎉 Audio berhasil diunduh: ${audioPath}`));
                } else {
                    console.log(blueBright('❌ Audio tidak tersedia untuk video ini'));
                }
            } else if (platform === 'ytmp3') {
                console.log(green.bold('\n🎵 Mode: Audio saja (YouTube MP3)'));
                const result = await downloader.downloadYouTubeMP3Audio(videoInfo, options.output);
                console.log(green.bold(`\n🎉 Audio berhasil diunduh: ${result.audioPath}`));
            } else {
                console.log(redBright('❌ Error: Download audio hanya tersedia untuk TikTok dan YouTube'));
                process.exit(1);
            }
        } else if (options.videoOnly) {
            console.log(green.bold('\n🎥 Mode: Video saja'));
            let result;
            
            if (platform === 'tiktok') {
                result = await downloader.downloadTikTokVideo(videoInfo, options.output, options.quality);
            } else if (platform === 'facebook') {
                result = await downloader.downloadFacebookVideo(videoInfo, options.output, options.quality);
            } else if (platform === 'ytmp4') {
                result = await downloader.downloadYouTubeMP4Video(videoInfo, options.output, options.quality);
            } else {
                console.log(redBright('❌ Error: Platform tidak mendukung download video'));
                process.exit(1);
            }
            
            console.log(green.bold(`\n🎉 Video berhasil diunduh: ${result.videoPath}`));
        } else {
            const supportedPlatforms = ['tiktok', 'facebook', 'ytmp4', 'ytmp3'];
            if (!supportedPlatforms.includes(platform)) {
                console.log(redBright(`❌ Error: Platform ${platform} tidak didukung`));
                process.exit(1);
            }

            let modeText = '';
            if (platform === 'tiktok') {
                modeText = 'Video + Audio';
            } else if (platform === 'facebook' || platform === 'ytmp4') {
                modeText = 'Video';
            } else if (platform === 'ytmp3') {
                modeText = 'Audio';
            }

            console.log(green.bold(`\n🎬 Mode: ${modeText} (${platform.toUpperCase()})`));
            const result = await downloader.downloadAll(videoInfo, options.output, options.quality, platform);
            
            console.log(green.bold(`\n🎉 Download selesai!`));
            if (result.videoPath) {
                console.log(green.bold(`📹 Video: ${result.videoPath}`));
            }
            if (result.audioPath) {
                console.log(green.bold(`🎵 Audio: ${result.audioPath}`));
            }
        }

    } catch (error) {
        console.error(redBright(`\n❌ Error: ${error.message}`));
        if (downloader.isTermux) {
            console.log(blueBright('\n💡 Tips Termux:'));
            console.log('- Pastikan koneksi internet stabil');
            console.log('- Cek storage permission dengan: termux-setup-storage');
            console.log('- Coba restart Termux jika masih error');
        }
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = VideoDownloader;
