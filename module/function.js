const axios = require('axios');
const { green, blueBright, redBright } = require('chalk');

class VideoDownloader {
    constructor() {
        this.apiBase = 'https://api.siputzx.my.id/api';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        this.endpoints = {
            tiktok: `${this.apiBase}/tiktok/v2`,
            facebook: `${this.apiBase}/d/facebook`,
            ytmp4: `${this.apiBase}/d/ytmp4`,
            ytmp3: `https://archive.lick.eu.org/api/download/ytmp3`,
            spotify: `https://api.ryzumi.vip/api/downloader/spotify`
        };
    }

    async fetchJson(url, options = {}) {
        try {
            const response = await axios.get(url, {
                timeout: 30000,
                ...options
            });
            
            return response.data || { status: false, msg: 'No data received' };
        } catch (error) {
            console.log(redBright(`API Error: ${error.message}`));
            return { status: false, msg: error.message };
        }
    }

    async getVideoInfo(videoUrl, platform = 'tiktok') {
        const endpoint = this.endpoints[platform];
        if (!endpoint) {
            return { status: false, msg: `Platform ${platform} not supported` };
        }

        try {
            console.log(`🔍 Fetching ${platform.toUpperCase()} info...`);
            
            const data = await this.fetchJson(`${endpoint}?url=${encodeURIComponent(videoUrl)}`, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json'
                }
            });

            if (!data || data.status === false || (platform === 'tiktok' && !data.success) || (platform === 'spotify' && !data.success)) {
                return { status: false, msg: data?.msg || 'Failed to get video data' };
            }

            return data;
        } catch (error) {
            return { status: false, msg: error.message };
        }
    }

    async downloadStream(url, options = {}) {
        try {
            const response = await axios.get(url, {
                responseType: 'stream',
                timeout: 60000,
                headers: {
                    'User-Agent': this.userAgent,
                    'Referer': 'https://www.tiktok.com/',
                    ...options.headers
                },
                ...options
            });

            return response;
        } catch (error) {
            console.log(redBright(`Download failed: ${error.message}`));
            return null;
        }
    }

    sanitizeFilename(filename) {
        if (!filename) return 'unknown_file';
        
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/[^\w\-_\.]/g, '_')
            .substring(0, 100);
    }

    formatFileSize(bytes) {
        if (!bytes || bytes < 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    displayVideoInfo(videoInfo, platform = 'tiktok') {
        if (!videoInfo) return;

        console.log(`\n📊 ${platform.toUpperCase()} Info:`);
        
        const displayMethods = {
            tiktok: () => this.displayTikTokInfo(videoInfo),
            facebook: () => this.displayFacebookInfo(videoInfo),
            ytmp4: () => this.displayYouTubeInfo(videoInfo, 'MP4'),
            ytmp3: () => this.displayYouTubeInfo(videoInfo, 'MP3'),
            spotify: () => this.displaySpotifyInfo(videoInfo)
        };

        displayMethods[platform]?.();
    }

    displayTikTokInfo(videoInfo) {
        const { data } = videoInfo;
        if (!data) return;

        if (data.metadata?.stats) {
            const stats = data.metadata.stats;
            console.log(` • Likes: ${(stats.likeCount || 0).toLocaleString()}`);
            console.log(` • Views: ${(stats.playCount || 0).toLocaleString()}`);
            console.log(` • Comments: ${(stats.commentCount || 0).toLocaleString()}`);
        }

        if (data.metadata?.description) {
            console.log(` • Description: ${data.metadata.description}`);
        }

        if (data.metadata?.hashtags?.length) {
            console.log(` • Hashtags: ${data.metadata.hashtags.join(', ')}`);
        }
    }

    displayFacebookInfo(videoInfo) {
        const { data } = videoInfo;
        if (!Array.isArray(data)) return;

        console.log(` • Available Qualities: ${data.length}`);
        data.forEach((video, index) => {
            if (video?.resolution && video?.format) {
                console.log(`   ${index + 1}. ${video.resolution} (${video.format})`);
            }
        });
    }

    displayYouTubeInfo(videoInfo, type) {
        const info = videoInfo.data || videoInfo.result || videoInfo;
        const title = info.title || 'Unknown Title';
        
        console.log(` • Title: ${title}`);
        console.log(` • Type: ${type} ${type === 'MP3' ? 'Audio' : 'Video'}`);
        
        if (type === 'MP3' && info.duration) {
            console.log(` • Duration: ${info.duration}`);
        }
    }

    displaySpotifyInfo(videoInfo) {
        const { metadata } = videoInfo;
        if (!metadata) return;

        console.log(` • Title: ${metadata.title || 'Unknown Title'}`);
        console.log(` • Artist: ${metadata.artists || 'Unknown Artist'}`);
        console.log(` • Album: ${metadata.album || 'Unknown Album'}`);
        
        if (metadata.releaseDate) {
            console.log(` • Release Date: ${metadata.releaseDate}`);
        }
        
        if (metadata.id) {
            console.log(` • Track ID: ${metadata.id}`);
        }
    }

    generateFilename(videoInfo, platform = 'tiktok', type = 'video') {
        const timestamp = Date.now();
        let filename = `${platform}_${timestamp}`;

        const titles = {
            tiktok: videoInfo?.data?.metadata?.description,
            ytmp4: videoInfo?.data?.title || videoInfo?.result?.title || videoInfo?.title,
            ytmp3: videoInfo?.result?.title,
            spotify: videoInfo?.metadata ? `${videoInfo.metadata.artists} - ${videoInfo.metadata.title}` : null
        };

        const title = titles[platform];
        if (title) {
            filename = `${this.sanitizeFilename(title)}_${timestamp}`;
        }

        if (type === 'audio') filename += '_audio';
        
        return this.sanitizeFilename(filename);
    }

    isValidVideoInfo(videoInfo, platform = 'tiktok') {
        if (!videoInfo || typeof videoInfo !== 'object') return false;

        const validators = {
            tiktok: () => videoInfo.success && videoInfo.data?.download,
            facebook: () => videoInfo.status !== false && Array.isArray(videoInfo.data),
            ytmp4: () => videoInfo.status !== false && (
                videoInfo.data?.url || videoInfo.result?.url || videoInfo.url
            ),
            ytmp3: () => videoInfo.status !== false && videoInfo.result?.audio_url,
            spotify: () => videoInfo.success && videoInfo.metadata && videoInfo.link
        };

        return validators[platform]?.() || videoInfo.status !== false;
    }

    getDownloadUrls(videoInfo, platform = 'tiktok') {
        if (!this.isValidVideoInfo(videoInfo, platform)) {
            return { video: [], audio: null };
        }

        const extractors = {
            tiktok: () => {
                const download = videoInfo.data.download;
                return {
                    video: Array.isArray(download.video) ? download.video : [download.video].filter(Boolean),
                    audio: download.audio || null
                };
            },
            facebook: () => ({
                video: videoInfo.data.map(item => item.url).filter(Boolean),
                audio: null
            }),
            ytmp4: () => {
                const videoUrl = videoInfo.data?.url || videoInfo.result?.url || videoInfo.url;
                return {
                    video: videoUrl ? [videoUrl] : [],
                    audio: null
                };
            },
            ytmp3: () => ({
                video: [],
                audio: videoInfo.result.audio_url
            }),
            spotify: () => ({
                video: [],
                audio: videoInfo.link
            })
        };

        return extractors[platform]?.() || { video: [], audio: null };
    }

    getSupportedPlatforms() {
        return Object.keys(this.endpoints);
    }

    isPlatformSupported(platform) {
        return this.endpoints.hasOwnProperty(platform);
    }
}

module.exports = VideoDownloader;
