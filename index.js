const fs = require('fs');
const path = require('path');
const os = require('os');
const VideoDownloaderAPI = require('./module/function');
const { green, blueBright, greenBright, redBright, cyan, yellow } = require('chalk');

class VideoDownloader {
    constructor() {
        this.api = new VideoDownloaderAPI();
        this.isTermux = this.detectTermux();
        this.defaultDownloadPath = this.getDefaultDownloadPath();
    }

    detectTermux() {
        return process.env.PREFIX?.includes('com.termux') ||
               process.env.TERMUX_VERSION ||
               fs.existsSync('/data/data/com.termux');
    }

    getDefaultDownloadPath() {
        if (this.isTermux) {
            const paths = [
                '/data/data/com.termux/files/home/storage/downloads',
                '/data/data/com.termux/files/home/downloads',
                '/sdcard/Download',
                path.join(os.homedir(), 'downloads')
            ];
            
            return paths.find(dir => {
                try { return fs.existsSync(dir); }
                catch { return false; }
            }) || './downloads';
        }
        
        return './downloads';
    }

    createDirectory(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { 
                recursive: true,
                mode: this.isTermux ? 0o755 : 0o777
            });
        }
    }
    
    async downloadFile(url, filepath, filename) {
        try {
            const response = await this.api.downloadStream(url);
            if (!response) throw new Error('Failed to get download stream');

            const totalSize = parseInt(response.headers['content-length'] || 0);
            let downloadedSize = 0;

            const fileStream = fs.createWriteStream(filepath, {
                mode: this.isTermux ? 0o644 : 0o666
            });

            response.data.on('data', (chunk) => {
                downloadedSize += chunk.length;
                this.showProgress(filename, downloadedSize, totalSize);
            });

            return new Promise((resolve, reject) => {
                response.data.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    this.clearProgress();
                    resolve(filepath);
                });

                fileStream.on('error', (error) => {
                    fs.unlink(filepath, () => {});
                    reject(error);
                });

                response.data.on('error', reject);
            });
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    showProgress(filename, downloaded, total) {
        const maxFilenameLength = 25; // Sesuaikan dengan lebar terminal
        const truncatedFilename = filename.length > maxFilenameLength 
            ? filename.substring(0, maxFilenameLength - 3) + '...' 
            : filename.padEnd(maxFilenameLength, ' ');

        const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        const spinnerIndex = Math.floor(Date.now() / 100) % spinner.length;
        
        if (total > 0) {
            const percentage = Math.round((downloaded / total) * 100);
            const downloadedFormatted = this.api.formatFileSize(downloaded);
            const totalFormatted = this.api.formatFileSize(total);
            
            const progressBarLength = 20;
            const filledLength = Math.round((percentage / 100) * progressBarLength);
            const progressBar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);  
            const progressText = `${spinner[spinnerIndex]} ${truncatedFilename} [${progressBar}] ${percentage}% (${downloadedFormatted}/${totalFormatted})`;
            
            const terminalWidth = process.stdout.columns || 80;
            const paddedText = progressText.padEnd(terminalWidth, ' ');
            
            process.stdout.write(`\r${paddedText.substring(0, terminalWidth - 1)}`);
        } else {
            const progressText = `${spinner[spinnerIndex]} ${truncatedFilename}: ${this.api.formatFileSize(downloaded)}`;
            const terminalWidth = process.stdout.columns || 80;
            const paddedText = progressText.padEnd(terminalWidth, ' ');
            
            process.stdout.write(`\r${paddedText.substring(0, terminalWidth - 1)}`);
        }
    }

    clearProgress() {
        const terminalWidth = process.stdout.columns || 80;
        const clearLine = ' '.repeat(terminalWidth);
        process.stdout.write(`\r${clearLine}\r`);
    }

    showProgressWithSpinner(filename, downloaded) {
        this.showProgress(filename, downloaded, 0);
    }

    async downloadByPlatform(videoInfo, platform, options = {}) {
        const { outputDir = this.defaultDownloadPath, quality = 'hd', audioOnly = false } = options;
        
        this.createDirectory(outputDir);
        this.api.displayVideoInfo(videoInfo, platform);

        const downloaders = {
            tiktok: () => this.downloadTikTok(videoInfo, outputDir, quality, audioOnly),
            facebook: () => this.downloadFacebook(videoInfo, outputDir, quality),
            ytmp4: () => this.downloadYouTubeVideo(videoInfo, outputDir, quality),
            ytmp3: () => this.downloadYouTubeAudio(videoInfo, outputDir),
            spotify: () => this.downloadSpotify(videoInfo, outputDir)
        };

        const downloader = downloaders[platform];
        if (!downloader) {
            throw new Error(`Platform ${platform} not supported`);
        }

        return await downloader();
    }

    async downloadTikTok(videoInfo, outputDir, quality, audioOnly) {
        const { data } = videoInfo;
        const urls = this.api.getDownloadUrls(videoInfo, 'tiktok');
        
        if (audioOnly && urls.audio) {
            return await this.downloadAudioOnly(urls.audio, outputDir, videoInfo, 'tiktok');
        }

        const videoUrl = quality === 'hd' && urls.video[1] ? urls.video[1] : urls.video[0];
        const filename = this.api.generateFilename(videoInfo, 'tiktok', 'video');
        const videoPath = path.join(outputDir, `${filename}.mp4`);

        await this.downloadFile(videoUrl, videoPath, `${filename}.mp4`);

        const result = { videoPath };
        
        if (urls.audio) {
            const audioPath = await this.downloadAudioOnly(urls.audio, outputDir, videoInfo, 'tiktok');
            result.audioPath = audioPath;
        }

        return result;
    }

    async downloadFacebook(videoInfo, outputDir, quality) {
        const urls = this.api.getDownloadUrls(videoInfo, 'facebook');
        const videoUrl = urls.video[0]; // Take first available quality
        
        const filename = this.api.generateFilename(videoInfo, 'facebook', 'video');
        const videoPath = path.join(outputDir, `${filename}.mp4`);

        await this.downloadFile(videoUrl, videoPath, `${filename}.mp4`);
        return { videoPath };
    }

    async downloadYouTubeVideo(videoInfo, outputDir, quality) {
        const urls = this.api.getDownloadUrls(videoInfo, 'ytmp4');
        const videoUrl = urls.video[0];
        
        const filename = this.api.generateFilename(videoInfo, 'ytmp4', 'video');
        const videoPath = path.join(outputDir, `${filename}.mp4`);

        await this.downloadFile(videoUrl, videoPath, `${filename}.mp4`);
        return { videoPath };
    }

    async downloadYouTubeAudio(videoInfo, outputDir) {
        const urls = this.api.getDownloadUrls(videoInfo, 'ytmp3');
        const audioUrl = urls.audio;
        
        const filename = this.api.generateFilename(videoInfo, 'ytmp3', 'audio');
        const audioPath = path.join(outputDir, `${filename}.mp3`);

        await this.downloadFile(audioUrl, audioPath, `${filename}.mp3`);
        return { audioPath };
    }

    async downloadSpotify(videoInfo, outputDir) {
        const urls = this.api.getDownloadUrls(videoInfo, 'spotify');
        const audioUrl = urls.audio;
        
        const filename = this.api.generateFilename(videoInfo, 'spotify', 'audio');
        const audioPath = path.join(outputDir, `${filename}.mp3`);

        await this.downloadFile(audioUrl, audioPath, `${filename}.mp3`);
        return { audioPath };
    }

    async downloadAudioOnly(audioUrl, outputDir, videoInfo, platform) {
        const filename = this.api.generateFilename(videoInfo, platform, 'audio');
        const audioPath = path.join(outputDir, `${filename}.mp3`);
        
        await this.downloadFile(audioUrl, audioPath, `${filename}.mp3`);
        return audioPath;
    }

    showHelp() {
        console.log(`
   ${redBright(' █▀▄ █▀▄ ██▀ █▄ █ █ █ █')}
   ${redBright(' █▀  █▀▄ █▄▄ █ ▀█ █ ▀▄▀')} 

   ${'\x1b[37m'} █▀▄ ▄▀▄ █   █ █▄ █ █   ▄▀▄ ▄▀▄ █▀▄ ██▀ █▀▄${'\x1b[0m'}
   ${'\x1b[37m'} █▄▀ ▀▄▀ ▀▄▀▄▀ █ ▀█ █▄▄ ▀▄▀ █▀█ █▄▀ █▄▄ █▀▄${'\x1b[0m'}

   ${yellow('Multi-Platform Video & Music Downloader')}
   ${greenBright('Github : https://github.com/arsya371/preniv-downloader')}

Usage:
  node index.js [options] <video_url>

Options:
  -p, --platform <name>   Platform: tiktok, facebook, ytmp4, ytmp3, spotify
  -o, --output <dir>      Output directory (default: ${this.defaultDownloadPath})
  -q, --quality <type>    Video quality: normal, hd (default: hd)
  -a, --audio-only        Download audio only
  -h, --help              Show this help

Examples:
  node index.js https://www.tiktok.com/@user/video/..
  node index.js https://facebook.com/watch/...
  node index.js https://www.youtube.com/...
  node index.js -p ytmp3 https://www.youtube.com/....
  node index.js https://open.spotify.com/track/..
  node index.js -p spotify https://open.spotify.com/track/...
  node index.js -o /sdcard/Download -q hd https://tiktok.com/...
  node index.js --audio-only https://tiktok.com/...

Supported Platforms:
  • TikTok (tiktok.com, vm.tiktok.com)
  • Facebook (facebook.com, fb.watch)
  • YouTube MP4 (youtube.com, youtu.be) - Video
  • YouTube MP3 (youtube.com, youtu.be) - Audio
  • Spotify (open.spotify.com) - Audio
        `);
    }

    checkPermissions() {
        if (this.isTermux) {
            const storagePath = '/data/data/com.termux/files/home/storage';
            if (!fs.existsSync(storagePath)) {
                console.log(redBright('⚠️  Storage not setup!'));
                console.log(blueBright('💡 Run: termux-setup-storage'));
                return false;
            }
        }
        return true;
    }
}

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        platform: null,
        output: null,
        quality: 'hd',
        audioOnly: false,
        infoOnly: false,
        url: null,
        showHelp: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        const argMap = {
            '-p': '--platform',
            '-o': '--output',
            '-q': '--quality',
            '-a': '--audio-only',
            '-i': '--info',
            '-h': '--help'
        };

        const fullArg = argMap[arg] || arg;

        switch (fullArg) {
            case '--platform':
                options.platform = args[++i];
                break;
            case '--output':
                options.output = args[++i];
                break;
            case '--quality':
                options.quality = args[++i];
                break;
            case '--audio-only':
                options.audioOnly = true;
                break;
            case '--info':
                options.infoOnly = true;
                break;
            case '--help':
                options.showHelp = true;
                break;
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
    const platforms = {
        'tiktok.com': 'tiktok',
        'vm.tiktok.com': 'tiktok',
        'facebook.com': 'facebook',
        'fb.watch': 'facebook',
        'youtube.com': 'ytmp4',
        'youtu.be': 'ytmp4',
        'open.spotify.com': 'spotify'
    };

    return Object.keys(platforms).find(domain => url.includes(domain))
        ? platforms[Object.keys(platforms).find(domain => url.includes(domain))]
        : 'unknown';
}

async function main() {
    const options = parseArgs();
    const downloader = new VideoDownloader();
    if (!downloader.checkPermissions()) {
        process.exit(1);
    }
    if (options.showHelp || !options.url) {
        downloader.showHelp();
        if (!options.url) {
            console.log('\n💡 Please provide a video URL');
        }
        process.exit(options.showHelp ? 0 : 1);
    }

    try {
        console.log(`
   ${redBright(' █▀▄ █▀▄ ██▀ █▄ █ █ █ █')}
   ${redBright(' █▀  █▀▄ █▄▄ █ ▀█ █ ▀▄▀')} 

   ${'\x1b[37m'} █▀▄ ▄▀▄ █   █ █▄ █ █   ▄▀▄ ▄▀▄ █▀▄ ██▀ █▀▄${'\x1b[0m'}
   ${'\x1b[37m'} █▄▀ ▀▄▀ ▀▄▀▄▀ █ ▀█ █▄▄ ▀▄▀ █▀█ █▄▀ █▄▄ █▀▄${'\x1b[0m'}

   ${yellow('Multi-Platform Video & Music Downloader')}
   ${greenBright('Github : https://github.com/arsya371/preniv-downloader')}
        `);
        let platform = options.platform || detectPlatform(options.url);
        if (options.audioOnly && platform === 'ytmp4') {
            platform = 'ytmp3';
        }
        
        if (platform === 'unknown') {
            console.error(redBright('❌ Platform not supported!'));
            process.exit(1);
        }

        console.log(green(`🔍 Platform: ${platform.toUpperCase()}`));
        const videoInfo = await downloader.api.getVideoInfo(options.url, platform);
        
        if (!downloader.api.isValidVideoInfo(videoInfo, platform)) {
            throw new Error('Invalid video info received');
        }
        
        if (options.infoOnly) {
            downloader.api.displayVideoInfo(videoInfo, platform);
            return;
        }

        const downloadOptions = {
            outputDir: options.output || downloader.defaultDownloadPath,
            quality: options.quality,
            audioOnly: options.audioOnly
        };

        const result = await downloader.downloadByPlatform(videoInfo, platform, downloadOptions);
        console.log(green('\n🎉 Download completed!'));
        if (result.videoPath) {
            console.log(`📹 Video: ${result.videoPath}`);
        }
        if (result.audioPath) {
            console.log(`🎵 Audio: ${result.audioPath}`);
        }

    } catch (error) {
        console.error(redBright(`\n❌ Error: ${error.message}`));
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = VideoDownloader;
