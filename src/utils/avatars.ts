// High-quality Flat Art Vector Illustrative Avatars
// Pure SVG data URIs: Zero external network dependencies, crisp at all resolutions, 100% offline capable

export interface DefaultAvatar {
  id: string;
  name: string;
  url: string;
  bgColor: string;
}

// Helper to encode SVG into Data URI
const svgToUri = (svgString: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;

export const FLAT_VECTOR_AVATARS: DefaultAvatar[] = [
  {
    id: 'fox',
    name: 'Scholar Fox',
    bgColor: '#FFF7ED',
    url: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#fed7aa" />
        <!-- Ears -->
        <polygon points="25,48 18,15 42,32" fill="#ea580c" />
        <polygon points="75,48 82,15 58,32" fill="#ea580c" />
        <polygon points="25,42 22,22 38,32" fill="#ffedd5" />
        <polygon points="75,42 78,22 62,32" fill="#ffedd5" />
        <!-- Head -->
        <path d="M22,46 Q50,30 78,46 Q80,72 50,86 Q20,72 22,46 Z" fill="#f97316" />
        <!-- Cheeks / Muzzle -->
        <path d="M24,54 Q36,52 50,62 Q64,52 76,54 Q72,76 50,86 Q28,76 24,54 Z" fill="#ffffff" />
        <!-- Eyes -->
        <ellipse cx="38" cy="50" rx="3.5" ry="4.5" fill="#1e293b" />
        <ellipse cx="62" cy="50" rx="3.5" ry="4.5" fill="#1e293b" />
        <circle cx="39.5" cy="48.5" r="1.2" fill="#ffffff" />
        <circle cx="63.5" cy="48.5" r="1.2" fill="#ffffff" />
        <!-- Glasses -->
        <circle cx="38" cy="50" r="8" fill="none" stroke="#0f172a" stroke-width="2.5" />
        <circle cx="62" cy="50" r="8" fill="none" stroke="#0f172a" stroke-width="2.5" />
        <path d="M46,50 L54,50" stroke="#0f172a" stroke-width="2.5" />
        <!-- Nose -->
        <polygon points="46,67 54,67 50,72" fill="#0f172a" />
      </svg>
    `),
  },
  {
    id: 'owl',
    name: 'Wise Owl',
    bgColor: '#EFF6FF',
    url: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#bfdbfe" />
        <!-- Body / Head -->
        <ellipse cx="50" cy="54" rx="32" ry="34" fill="#3b82f6" />
        <ellipse cx="50" cy="62" rx="20" ry="22" fill="#dbeafe" />
        <!-- Ear tufts -->
        <polygon points="26,30 35,42 20,44" fill="#1d4ed8" />
        <polygon points="74,30 65,42 80,44" fill="#1d4ed8" />
        <!-- Eye Patches -->
        <circle cx="37" cy="48" r="13" fill="#ffffff" stroke="#93c5fd" stroke-width="2" />
        <circle cx="63" cy="48" r="13" fill="#ffffff" stroke="#93c5fd" stroke-width="2" />
        <!-- Pupils -->
        <circle cx="37" cy="48" r="6" fill="#1e293b" />
        <circle cx="63" cy="48" r="6" fill="#1e293b" />
        <circle cx="39" cy="46" r="2" fill="#ffffff" />
        <circle cx="65" cy="46" r="2" fill="#ffffff" />
        <!-- Beak -->
        <polygon points="46,55 54,55 50,64" fill="#f59e0b" />
        <!-- Graduation Cap -->
        <polygon points="50,14 78,24 50,34 22,24" fill="#0f172a" />
        <rect x="42" y="27" width="16" height="7" rx="2" fill="#1e293b" />
        <circle cx="50" cy="24" r="2.5" fill="#eab308" />
        <path d="M50,24 Q68,26 70,36" fill="none" stroke="#eab308" stroke-width="2" />
      </svg>
    `),
  },
  {
    id: 'cat',
    name: 'Cosmic Cat',
    bgColor: '#FAF5FF',
    url: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#e9d5ff" />
        <!-- Ears -->
        <polygon points="20,44 26,16 46,34" fill="#9333ea" />
        <polygon points="80,44 74,16 54,34" fill="#9333ea" />
        <polygon points="26,38 30,22 42,33" fill="#f3e8ff" />
        <polygon points="74,38 70,22 58,33" fill="#f3e8ff" />
        <!-- Head -->
        <circle cx="50" cy="54" r="30" fill="#a855f7" />
        <!-- Eyes -->
        <ellipse cx="38" cy="50" rx="6" ry="7" fill="#fbbf24" />
        <ellipse cx="62" cy="50" rx="6" ry="7" fill="#fbbf24" />
        <ellipse cx="38" cy="50" rx="2.5" ry="6" fill="#0f172a" />
        <ellipse cx="62" cy="50" rx="2.5" ry="6" fill="#0f172a" />
        <!-- Muzzle -->
        <polygon points="47,59 53,59 50,62" fill="#f472b6" />
        <path d="M44,64 Q50,68 50,62 Q50,68 56,64" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
        <!-- Cheeks -->
        <circle cx="32" cy="58" r="3.5" fill="#f472b6" opacity="0.6" />
        <circle cx="68" cy="58" r="3.5" fill="#f472b6" opacity="0.6" />
        <!-- Headset -->
        <path d="M22,50 A28,28 0 0,1 78,50" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />
        <rect x="18" y="44" width="7" height="14" rx="3" fill="#0284c7" />
        <rect x="75" y="44" width="7" height="14" rx="3" fill="#0284c7" />
      </svg>
    `),
  },
  {
    id: 'panda',
    name: 'Mindful Panda',
    bgColor: '#ECFDF5',
    url: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#a7f3d0" />
        <!-- Ears -->
        <circle cx="26" cy="28" r="12" fill="#0f172a" />
        <circle cx="74" cy="28" r="12" fill="#0f172a" />
        <!-- Head -->
        <circle cx="50" cy="54" r="32" fill="#ffffff" />
        <!-- Eye Patches -->
        <ellipse cx="37" cy="48" rx="8" ry="10" transform="rotate(-15 37 48)" fill="#0f172a" />
        <ellipse cx="63" cy="48" rx="8" ry="10" transform="rotate(15 63 48)" fill="#0f172a" />
        <!-- Eyes -->
        <circle cx="38" cy="48" r="3" fill="#ffffff" />
        <circle cx="62" cy="48" r="3" fill="#ffffff" />
        <circle cx="39" cy="47.5" r="1.2" fill="#0f172a" />
        <circle cx="61" cy="47.5" r="1.2" fill="#0f172a" />
        <!-- Nose & Mouth -->
        <ellipse cx="50" cy="58" rx="4.5" ry="3" fill="#0f172a" />
        <path d="M46,63 Q50,67 54,63" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />
        <!-- Bamboo Leaf -->
        <path d="M50,75 Q65,65 68,54 Q55,60 50,75 Z" fill="#10b981" />
      </svg>
    `),
  },
  {
    id: 'rabbit',
    name: 'Focus Bunny',
    bgColor: '#FDF2F8',
    url: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#fbcfe8" />
        <!-- Ears -->
        <path d="M34,42 C26,20 32,6 38,8 C44,10 42,28 38,42 Z" fill="#ffffff" />
        <path d="M35,38 C30,22 34,12 37,13 C40,14 39,26 37,38 Z" fill="#f472b6" />
        <path d="M66,42 C74,20 68,6 62,8 C56,10 58,28 62,42 Z" fill="#ffffff" />
        <path d="M65,38 C70,22 66,12 63,13 C60,14 61,26 63,38 Z" fill="#f472b6" />
        <!-- Head -->
        <circle cx="50" cy="58" r="28" fill="#ffffff" />
        <!-- Cheeks -->
        <circle cx="34" cy="62" r="4" fill="#fbcfe8" />
        <circle cx="66" cy="62" r="4" fill="#fbcfe8" />
        <!-- Eyes -->
        <circle cx="41" cy="54" r="3.5" fill="#0f172a" />
        <circle cx="59" cy="54" r="3.5" fill="#0f172a" />
        <circle cx="42" cy="53" r="1.2" fill="#ffffff" />
        <circle cx="60" cy="53" r="1.2" fill="#ffffff" />
        <!-- Nose -->
        <polygon points="48,60 52,60 50,63" fill="#f472b6" />
        <path d="M47,65 Q50,68 53,65" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" />
        <!-- Book on chest -->
        <rect x="42" y="74" width="16" height="12" rx="2" fill="#ec4899" />
        <line x1="50" y1="74" x2="50" y2="86" stroke="#ffffff" stroke-width="1.5" />
      </svg>
    `),
  },
  {
    id: 'penguin',
    name: 'Tech Penguin',
    bgColor: '#F0FDF4',
    url: svgToUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#bbf7d0" />
        <!-- Body -->
        <ellipse cx="50" cy="56" rx="30" ry="34" fill="#1e293b" />
        <!-- Belly -->
        <ellipse cx="50" cy="60" rx="20" ry="24" fill="#ffffff" />
        <!-- Eyes -->
        <circle cx="41" cy="46" r="4" fill="#ffffff" />
        <circle cx="59" cy="46" r="4" fill="#ffffff" />
        <circle cx="41" cy="46" r="2.5" fill="#0f172a" />
        <circle cx="59" cy="46" r="2.5" fill="#0f172a" />
        <circle cx="42" cy="45" r="1" fill="#ffffff" />
        <circle cx="60" cy="45" r="1" fill="#ffffff" />
        <!-- Beak -->
        <polygon points="45,52 55,52 50,60" fill="#f59e0b" />
        <!-- Yellow Ear Tufts -->
        <path d="M30,36 Q38,40 42,42" stroke="#eab308" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M70,36 Q62,40 58,42" stroke="#eab308" stroke-width="3" stroke-linecap="round" fill="none" />
        <!-- Bow Tie -->
        <polygon points="44,68 50,71 44,74" fill="#ef4444" />
        <polygon points="56,68 50,71 56,74" fill="#ef4444" />
        <circle cx="50" cy="71" r="2" fill="#b91c1c" />
      </svg>
    `),
  },
];

// Helper to compress uploaded user photos to a compact base64 data URL
export const processUserUploadedImage = (
  file: File,
  maxDimension = 256,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};
