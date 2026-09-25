# DropZone - File Sharing Made Simple

A modern, fast file-sharing web application built with React, TypeScript, and Tailwind CSS.

## ✨ Features

- **Drag & Drop Upload**: Simply drag files or click to browse
- **Multiple File Support**: Upload and share multiple files at once
- **Instant Share Links**: Get shareable URLs immediately after upload
- **File Previews**: Preview images, videos, audio, and PDFs
- **Download All**: Download entire collections as ZIP files
- **Copy Links**: One-click copy for individual files or entire collections
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile
- **Dark Mode**: Modern dark UI inspired by Linear, Raycast, and Vercel

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 📦 How It Works

### Default Mode: Local Browser Storage

By default, DropZone uses **IndexedDB** to store files directly in your browser. This means:

✅ **Works immediately** - No setup required  
✅ **Fast uploads** - Files stay in your browser  
✅ **Privacy-friendly** - Nothing leaves your device  
✅ **Share links work** - On the same browser/device  

⚠️ **Limitations**:
- Share links only work on the same browser/device
- Files are cleared when you clear browser data
- Cannot share across different devices

### Optional: Cloud Storage with Supabase

For **cross-device sharing** and **persistent storage**, you can configure Supabase:

1. Create a free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings → API
4. Create a `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_STORAGE_BUCKET=dropzone-files
```

5. Set up the database schema (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
6. Restart the dev server

With Supabase configured:

✅ **Share links work anywhere** - Any device, any browser  
✅ **Persistent storage** - Files survive browser clears  
✅ **Cross-device sharing** - Share with anyone  
✅ **Cloud backup** - Files stored securely in the cloud  

## 🎨 Design

DropZone features a premium dark UI inspired by modern tools like:
- Linear
- Raycast
- Arc Browser
- Vercel

Key design principles:
- Near-black backgrounds with subtle gray borders
- Glass/translucent surfaces used sparingly
- Small-radius corners (not excessively rounded)
- Clean typography with strong visual hierarchy
- Smooth micro-interactions and animations
- Generous spacing and minimal clutter

## 🏗️ Architecture

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── CollectionCard.tsx
│   ├── DropZone.tsx
│   ├── FileCard.tsx
│   ├── FileIcon.tsx
│   ├── Header.tsx
│   └── ProgressBar.tsx
├── hooks/              # Custom React hooks
│   ├── useClipboard.ts
│   └── useUpload.ts
├── lib/                # Core logic
│   ├── fileUtils.ts    # File type detection & formatting
│   ├── shareLink.ts    # URL generation
│   ├── storage.ts      # Hybrid storage (local + cloud)
│   ├── supabase.ts     # Supabase client
│   └── zipUtils.ts     # ZIP file creation
├── pages/              # Route pages
│   ├── HomePage.tsx    # Upload interface
│   └── SharePage.tsx   # Share view & download
├── types/              # TypeScript types
│   └── index.ts
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## 🔧 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS 4** - Styling
- **React Router** - Routing
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **JSZip** - ZIP file creation
- **@supabase/supabase-js** - Cloud storage (optional)
- **uuid** - Unique ID generation

## 📱 Usage

### Upload Files

1. Drag files onto the upload zone, or click to browse
2. Watch the progress bar as files upload
3. Once complete, you'll see your share link

### Share Files

1. Copy the share link using the "Copy Link" button
2. Share it with anyone
3. They can view and download your files

### Download Files

- **Individual files**: Click the download button on any file card
- **All files**: Click "Download All" to get a ZIP archive

### Multiple Files

Upload multiple files at once to create a collection:
- One share link for all files
- Individual download buttons for each file
- "Download All" creates a ZIP with all files

## 🔒 Privacy & Security

### Local Mode (Default)
- Files are stored in your browser's IndexedDB
- Nothing is uploaded to any server
- Share links only work on your device
- Clear browser data to remove files

### Cloud Mode (Optional)
- Files are encrypted in transit (HTTPS)
- Stored in Supabase Storage (AWS S3-backed)
- Share links are public by design
- You control when to delete files

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 🙏 Acknowledgments

Design inspiration from:
- [Linear](https://linear.app)
- [Raycast](https://raycast.com)
- [Arc Browser](https://arc.net)
- [Vercel](https://vercel.com)

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**
