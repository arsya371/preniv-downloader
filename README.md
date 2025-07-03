# 🎥 Preniv - Multi Platform Video Downloader

Tool canggih untuk download video dari berbagai platform seperti TikTok, Facebook, dan YouTube dengan dukungan penuh untuk Termux Android.

## ✨ Fitur Utama

- 🎯 **Multi-Platform**: TikTok, Facebook, YouTube (MP4 & MP3)
- 🎬 **Kualitas Beragam**: Normal, HD, dan deteksi otomatis kualitas terbaik
- 🎵 **Ekstrak Audio**: Download audio terpisah dari video
- 📱 **Termux Support**: Dioptimalkan untuk Android Termux
- 📊 **Progress Bar**: Progress download real-time dengan ukuran file
- 🤖 **Auto-Detection**: Deteksi platform otomatis dari URL
- 📁 **Smart Path**: Auto-detect jalur download terbaik
- 🔧 **Opsi Fleksibel**: Berbagai mode download (video saja, audio saja, info saja)

## 📦 Instalasi

### 🐧 Linux (Ubuntu/Debian)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js dan npm
sudo apt install nodejs npm git -y

# Verify installation
node --version
npm --version

# Clone dan install
git clone https://github.com/arsya371/preniv-downloader.git
cd preniv-downloader
npm install
```

### 🍎 macOS
```bash
# Install Homebrew (jika belum ada)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node git

# Verify installation
node --version
npm --version

# Clone dan install
git clone https://github.com/arsya371/preniv-downloader.git
cd preniv-downloader
npm install
```

### 🪟 Windows
```bash
# Download Node.js dari nodejs.org
# Install Git dari git-scm.com
# Buka Command Prompt atau PowerShell

# Clone dan install
git clone https://github.com/arsya371/preniv-downloader.git
cd preniv-downloader
npm install
```

### 📱 Termux Android
```bash
# Install dependencies
pkg install nodejs git
termux-setup-storage

# Clone dan install
git clone https://github.com/arsya371/preniv-downloader.git
cd preniv-downloader
npm install
```

## 🚀 Cara Penggunaan

### Penggunaan Dasar
```bash
node index.js <url_video>
```

### Opsi Command Lengkap
```bash
node index.js [options] <video_url>
```

| Opsi | Deskripsi | Contoh |
|------|-----------|--------|
| `-p, --platform` | Platform: tiktok, facebook, ytmp4, ytmp3 | `-p ytmp3` |
| `-o, --output` | Folder download | `-o /sdcard/Download` |
| `-q, --quality` | Kualitas: normal, hd | `-q hd` |
| `-a, --audio-only` | Download audio saja | `-a` |
| `-v, --video-only` | Download video saja | `-v` |
| `-i, --info` | Tampilkan info video saja | `-i` |
| `-h, --help` | Bantuan | `-h` |

### 📝 Contoh Penggunaan

```bash
# Download biasa (auto-detect platform)
node index.js https://www.tiktok.com/@user/video/1234567890

# Download Facebook video
node index.js https://facebook.com/watch/?v=1234567890

# Download YouTube video (MP4)
node index.js https://www.youtube.com/watch?v=dQw4w9WgXcQ

# Download YouTube audio (MP3)
node index.js -p ytmp3 https://www.youtube.com/watch?v=dQw4w9WgXcQ

# Custom folder dengan kualitas HD
node index.js -o /sdcard/Download -q hd https://tiktok.com/...

# Download audio saja (TikTok/YouTube)
node index.js --audio-only https://tiktok.com/...

# Tampilkan info video saja
node index.js --info https://facebook.com/...
```

## 🎯 Platform yang Didukung

| Platform | Video | Audio | HD | Auto-Detect |
|----------|-------|-------|-----|-------------|
| **TikTok** | ✅ | ✅ | ✅ | ✅ |
| **Facebook** | ✅ | ❌ | ✅ | ✅ |
| **YouTube (MP4)** | ✅ | ❌ | ✅ | ✅ |
| **YouTube (MP3)** | ❌ | ✅ | ✅ | Manual |

### URL yang Didukung
- TikTok: `tiktok.com`, `vm.tiktok.com`
- Facebook: `facebook.com`, `fb.watch`
- YouTube: `youtube.com`, `youtu.be`

## 🖥️ Konfigurasi Platform

### 🐧 Linux (Ubuntu/Debian)
```bash
# Jalur download default
~/Downloads/

# Buat folder custom
mkdir -p ~/Videos/Downloads
node index.js -o ~/Videos/Downloads <url>

# Permission untuk executable
chmod +x index.js

# Alias untuk kemudahan (optional)
echo 'alias vdl="node ~/preniv-downloader/index.js"' >> ~/.bashrc
source ~/.bashrc
```

### 🍎 macOS
```bash
# Jalur download default
~/Downloads/

# Buat folder custom
mkdir -p ~/Movies/Downloads
node index.js -o ~/Movies/Downloads <url>

# Permission untuk executable
chmod +x index.js

# Alias untuk kemudahan (optional)
echo 'alias vdl="node ~/preniv-downloader/index.js"' >> ~/.zshrc
source ~/.zshrc
```

### 🪟 Windows
```cmd
# Jalur download default (Command Prompt)
%USERPROFILE%\Downloads\

# Jalur download default (PowerShell)
$env:USERPROFILE\Downloads\

# Buat folder custom
mkdir C:\Downloads\Videos
node index.js -o C:\Downloads\Videos <url>

# Buat batch file untuk kemudahan (optional)
echo @echo off > vdl.bat
echo node "%~dp0index.js" %* >> vdl.bat
```

### 📱 Termux Android

#### Setup Awal
```bash
# Install Node.js
pkg install nodejs

# Setup akses storage
termux-setup-storage

# Install dependencies
npm install
```

#### Jalur Download Default
- **Termux**: `~/storage/downloads` (terhubung ke folder Download Android)
- **Alternatif**: `/sdcard/Download`, `/data/data/com.termux/files/home/downloads`

#### Tips Termux
```bash
# Cek permission storage
ls ~/storage/

# Download langsung ke folder Download Android
node index.js -o /sdcard/Download <url>

# Cek space storage
df -h

# Alias untuk kemudahan
echo 'alias vdl="node ~/preniv-downloader/index.js"' >> ~/.bashrc
source ~/.bashrc
```

## 🔧 Fitur Lanjutan

### Progress Bar
```
⬇️  video_tiktok_hd.mp4: [████████████████████] 100% (15.2MB/15.2MB)
📂 Lokasi: /storage/emulated/0/Download/video_tiktok_hd.mp4
```

### Auto-Detection Platform
Tool akan otomatis mendeteksi platform dari URL:
- Tidak perlu specify `-p` untuk TikTok, Facebook, YouTube MP4
- Gunakan `-p ytmp3` khusus untuk YouTube audio

### Smart File Naming
- Contoh: `tiktok_dance_video_hd_20231204.mp4`
- Karakter khusus otomatis dibersihkan

## 🐛 Troubleshooting

### 🐧 Linux
```bash
# Node.js tidak ditemukan
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Permission denied
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# ffmpeg dependency (optional)
sudo apt install ffmpeg
```

### 🍎 macOS
```bash
# Node.js tidak ditemukan
brew install node

# Permission denied
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Xcode command line tools
xcode-select --install

# ffmpeg dependency (optional)
brew install ffmpeg
```

### 🪟 Windows
```cmd
# Node.js tidak ditemukan
# Download dari nodejs.org dan install manual

# NPM permission error
npm install -g npm

# Windows Defender blocking
# Tambahkan folder ke exclusion list

# ffmpeg dependency (optional)
# Download dari ffmpeg.org
```

### 📱 Termux Android

#### Error Storage di Termux
```bash
# Setup ulang storage
termux-setup-storage

# Cek permission
ls ~/storage/

# Reset permission
termux-reload-settings
```

#### Error Package Installation
```bash
# Update package list
pkg update && pkg upgrade

# Install ulang Node.js
pkg install nodejs

# Clear npm cache
npm cache clean --force
```

### 🔧 Error Umum Semua Platform

#### Download Gagal
- ✅ Cek koneksi internet
- ✅ Pastikan URL valid dan accessible
- ✅ Cek space storage tersedia
- ✅ Restart terminal/aplikasi

#### Error Platform Tidak Didukung
```bash
# Cek platform support
node index.js -h

# Force specify platform
node index.js -p tiktok <url>
```

#### Error Memory/Performance
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
node index.js <url>

# Check system resources
# Linux/macOS: htop atau top
# Windows: Task Manager
```

## 🤝 Kontribusi

1. **Fork** repository ini
2. **Buat branch** baru (`git checkout -b feature/platform-etc`)
3. **Commit** perubahan (`git commit -m 'platform-etc'`)
4. **Push** ke branch (`git push origin feature/platform-etc`)
5. **Buat Pull Request**

## 🙏 Terimakasih

Terima kasih kepada penyedia API:
- `https://api.siputzx.my.id/`
- `https://archive.lick.eu.org/`

## 📄 Lisensi

Distributed under the MIT License. See `LICENSE` for more information.

## ⚠️ Disclaimer

- Tool ini untuk penggunaan pribadi dan edukasi
- Hormati Terms of Service platform yang digunakan
- Tidak bertanggung jawab atas penyalahgunaan tool
- Tools tidak boleh di perjual belikan

---

**Dibuat dengan ❤️ oleh Arsya**

🔗 **Links:**
- [GitHub](https://github.com/arsya371/preniv-downloader)
- [Issues](https://github.com/arsya371/preniv-downloader/issues)
- [Discussions](https://github.com/arsya371/preniv-downloader/discussions)
