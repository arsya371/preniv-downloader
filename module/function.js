const axios = require('axios');
const { green, blueBright, redBright } = require('chalk')

module.exports = class Function {
    constructor() {
        this.apiBase = 'https://api.siputzx.my.id/api';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.endpoints = {
            tiktok: `${this.apiBase}/tiktok/v2`,
            facebook: `${this.apiBase}/d/facebook`,
            ytmp4: `${this.apiBase}/d/ytmp4`,
            ytmp3: `https://archive.lick.eu.org/api/download/ytmp3`
        };
    }

    fetchJson = async (url, options = {}) => {
        try {
            const response = await axios.get(url, {
                timeout: 30000,
                ...options
            });
            
            if (!response || !response.data) {
                return {
                    status: false,
                    msg: 'Invalid response from server'
                };
            }
            
            return response.data;
        } catch (e) {
            console.log(redBright(`FetchJson Error: ${e.message}`));
            return {
                status: false,
                msg: e.message
            };
        }
    }

    async getVideoInfo(videoUrl, platform = 'tiktok') {
        try {
            const endpoint = this.endpoints[platform];
            if (!endpoint) {
                console.log(redBright(`Platform ${platform} tidak didukung`));
                return {
                    status: false,
                    msg: `Platform ${platform} tidak didukung`
                };
            }

            const apiUrl = `${endpoint}?url=${encodeURIComponent(videoUrl)}`;
            
            console.log(green.bold(`🔍 Mengambil informasi dari ${platform.toUpperCase()}...`));
            
            const data = await this.fetchJson(apiUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json'
                }
            });

            if (!data || data.status === false) {
                console.log(redBright(data?.msg || `Gagal mendapatkan data video dari ${platform}`));
                return data || { status: false, msg: 'No data received' };
            }

            if (platform === 'tiktok' && !data.success) {
                console.log(redBright(`API response unsuccessful untuk ${platform}`));
                return {
                    status: false,
                    msg: `API response unsuccessful untuk ${platform}`
                };
            }

            return data;
        } catch (error) {
            console.log(redBright(`Error getting video info from ${platform}: ${error.message}`));
            return {
                status: false,
                msg: error.message
            };
        }
    }

    async getTikTokInfo(tiktokUrl) {
        return this.getVideoInfo(tiktokUrl, 'tiktok');
    }

    async downloadStream(url, options = {}) {
        try {
            if (!url || typeof url !== 'string') {
                console.log(redBright('Invalid URL provided for download'));
                return null;
            }

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

            if (!response || !response.data) {
                console.log(redBright('Invalid response received'));
                return null;
            }

            return response;
        } catch (error) {
            console.log(redBright(`Download failed: ${error.message}`));
            return null;
        }
    }

    sanitizeFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return 'unknown_file';
        }

        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/[^\w\-_\.]/g, '_')
            .substring(0, 100);
    }

    formatFileSize(bytes) {
        if (typeof bytes !== 'number' || bytes < 0) {
            return '0 Bytes';
        }

        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    displayVideoInfo(videoInfo, platform = 'tiktok') {
        if (!videoInfo || typeof videoInfo !== 'object') {
            console.log(redBright('Invalid video info provided'));
            return;
        }

        console.log(blueBright(`\n📊 Informasi Video ${platform.toUpperCase()}:`));
        
        if (platform === 'tiktok') {
            this.displayTikTokInfo(videoInfo);
        } else if (platform === 'facebook') {
            this.displayFacebookInfo(videoInfo);
        } else if (platform === 'ytmp4') {
            this.displayYouTubeMP4Info(videoInfo);
        } else if (platform === 'ytmp3') {
            this.displayYouTubeMP3Info(videoInfo);
        }
    }

    displayTikTokInfo(videoInfo) {
        if (!videoInfo || !videoInfo.data) {
            console.log(redBright('Invalid TikTok video info'));
            return;
        }

        const { data } = videoInfo;
        const postId = videoInfo.postId || 'unknown';

        console.log(blueBright(` • Post ID: ${postId}`));
        
        if (data.metadata && data.metadata.stats) {
            const stats = data.metadata.stats;
            console.log(blueBright(` • Likes: ${(stats.likeCount || 0).toLocaleString()}`));
            console.log(blueBright(` • Views: ${(stats.playCount || 0).toLocaleString()}`));
            console.log(blueBright(` • Comments: ${(stats.commentCount || 0).toLocaleString()}`));
            console.log(blueBright(` • Shares: ${(stats.shareCount || 0).toLocaleString()}`));
        }

        if (data.metadata && data.metadata.description) {
            console.log(blueBright(` • Deskripsi: ${data.metadata.description}`));
        }

        if (data.metadata && data.metadata.hashtags && Array.isArray(data.metadata.hashtags) && data.metadata.hashtags.length > 0) {
            console.log(blueBright(` • Hashtags: ${data.metadata.hashtags.join(', ')}`));
        }

        if (data.metadata && data.metadata.locationCreated) {
            console.log(blueBright(` • Lokasi: ${data.metadata.locationCreated}`));
        }

        if (data.download) {
            const videoCount = data.download.video ? (Array.isArray(data.download.video) ? data.download.video.length : 1) : 0;
            console.log(blueBright(` • Video URLs: ${videoCount}`));
            console.log(blueBright(` • Audio URL: ${data.download.audio ? 'Available' : 'Not available'}`));
        }
    }

    displayFacebookInfo(videoInfo) {
        if (!videoInfo || !videoInfo.data || !Array.isArray(videoInfo.data)) {
            console.log(redBright('Invalid Facebook video info'));
            return;
        }

        const { data } = videoInfo;
        
        console.log(blueBright(` • Video ID: Facebook Video`));
        console.log(blueBright(` • Available Qualities: ${data.length}`));

        data.forEach((video, index) => {
            if (video && video.resolution && video.format) {
                console.log(blueBright(`${index + 1}. ${video.resolution} (${video.format})`));
            }
        });
        
        console.log(blueBright(` • Audio: Included in video file`));
    }

    displayYouTubeMP4Info(videoInfo) {
        let title = 'Unknown Title';
        let downloadUrl = 'Unknown';

        if (videoInfo.data && videoInfo.data.title) {
            title = videoInfo.data.title;
            downloadUrl = videoInfo.data.url ? 'Available' : 'Not available';
        } else if (videoInfo.result && videoInfo.result.title) {
            title = videoInfo.result.title;
            downloadUrl = videoInfo.result.url ? 'Available' : 'Not available';
        } else if (videoInfo.title) {
            title = videoInfo.title;
            downloadUrl = videoInfo.url ? 'Available' : 'Not available';
        }
        
        console.log(blueBright(` • Title: ${title}`));
        console.log(blueBright(` • Type: MP4 Video`));
        console.log(blueBright(` • Download URL: ${downloadUrl}`));
        console.log(blueBright(` • Audio: Included in video file`));
    }

    displayYouTubeMP3Info(videoInfo) {
        if (!videoInfo || !videoInfo.result) {
            console.log(redBright('Invalid YouTube MP3 video info'));
            return;
        }

        const { result } = videoInfo;
        
        console.log(blueBright(` • Title: ${result.title}`));
        console.log(blueBright(` • Duration: ${result.duration}`));
        console.log(blueBright(` • Upload Date: ${result.uploadDate}`));
        console.log(blueBright(` • Description: ${result.description.substring(0, 100)}...`));
        console.log(blueBright(` • Type: MP3 Audio`));
        console.log(blueBright(` • Audio URL: Available`));
    }

    generateFilename(videoInfo, quality = 'normal', type = 'video', platform = 'tiktok') {
        let filename = '';
        
        if (platform === 'tiktok') {
            const postId = (videoInfo && videoInfo.postId) ? videoInfo.postId : 'unknown';
            filename = `tiktok_${Date.now()}`;

            if (videoInfo && videoInfo.data && videoInfo.data.metadata && videoInfo.data.metadata.description) {
                const desc = this.sanitizeFilename(videoInfo.data.metadata.description);
                filename = `${filename}`;
            }
        } else if (platform === 'facebook') {
            filename = `facebook_${Date.now()}`;
        } else if (platform === 'ytmp4') {
            filename = `youtube_${Date.now()}`;
            
            let title = null;
            if (videoInfo && videoInfo.data && videoInfo.data.title) {
                title = videoInfo.data.title;
            } else if (videoInfo && videoInfo.result && videoInfo.result.title) {
                title = videoInfo.result.title;
            } else if (videoInfo && videoInfo.title) {
                title = videoInfo.title;
            }
            
            if (title) {
                const sanitizedTitle = this.sanitizeFilename(title);
                filename = `${sanitizedTitle}_${Date.now()}`;
            }
        } else if (platform === 'ytmp3') {
            filename = `youtube_audio_${Date.now()}`;
            if (videoInfo && videoInfo.result && videoInfo.result.title) {
                const title = this.sanitizeFilename(videoInfo.result.title);
                filename = `${title}_${Date.now()}`;
            }
        } else {
            filename = `${platform}_${Date.now()}`;
        }

        if (quality === 'hd' && type === 'video') {
            filename += '_HD';
        }

        if (type === 'audio') {
            filename += '_audio';
        }

        return this.sanitizeFilename(filename);
    }

    getSupportedPlatforms() {
        return Object.keys(this.endpoints);
    }

    isPlatformSupported(platform) {
        return this.endpoints.hasOwnProperty(platform);
    }

    isValidVideoInfo(videoInfo, platform = 'tiktok') {
        if (!videoInfo || typeof videoInfo !== 'object') {
            return false;
        }

        if (platform === 'tiktok') {
            return videoInfo.success && videoInfo.data && videoInfo.data.download;
        } else if (platform === 'facebook') {
            return videoInfo.status !== false && videoInfo.data && Array.isArray(videoInfo.data);
        } else if (platform === 'ytmp4') {
            return videoInfo.status !== false && (
                (videoInfo.data && videoInfo.data.url) ||
                (videoInfo.result && videoInfo.result.url) ||
                (videoInfo.url)
            );
        } else if (platform === 'ytmp3') {
            return videoInfo.status !== false && videoInfo.result && videoInfo.result.audio_url;
        }

        return videoInfo.status !== false;
    }

    getDownloadUrls(videoInfo, platform = 'tiktok') {
        if (!this.isValidVideoInfo(videoInfo, platform)) {
            return { video: [], audio: null };
        }

        if (platform === 'tiktok') {
            const download = videoInfo.data.download;
            return {
                video: Array.isArray(download.video) ? download.video : (download.video ? [download.video] : []),
                audio: download.audio || null
            };
        } else if (platform === 'facebook') {
            return {
                video: videoInfo.data.map(item => item.url).filter(Boolean),
                audio: null
            };
        } else if (platform === 'ytmp4') {
            let videoUrl = null;
            if (videoInfo.data && videoInfo.data.url) {
                videoUrl = videoInfo.data.url;
            } else if (videoInfo.result && videoInfo.result.url) {
                videoUrl = videoInfo.result.url;
            } else if (videoInfo.url) {
                videoUrl = videoInfo.url;
            }
            
            return {
                video: videoUrl ? [videoUrl] : [],
                audio: null
            };
        } else if (platform === 'ytmp3') {
            return {
                video: [],
                audio: videoInfo.result.audio_url
            };
        }

        return { video: [], audio: null };
    }
}
